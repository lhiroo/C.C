const { get, run, all, batch } = require('../../db/query');
const { rollRarity, RARITIES }  = require('./drops');
const fs                        = require('fs');
const path                      = require('path');

const ROLL_LIMIT      = 10;
const ROLL_WINDOW_MS  = 60 * 60 * 1000;
const CLAIM_CD_MS     = 3 * 60 * 60 * 1000;
const ROLL_EXPIRES_MS = 60 * 1000;
let _characterCache = null;

// ── Seed personnages ───────────────────────────────────────────
async function seedCharacters() {
  const fs   = require('fs');
  const path = require('path');

  const chars = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'data', 'characters.json'), 'utf-8')
  );

  // Upsert : insert ou update sans toucher aux données joueurs
  const upsertQueries = chars.map(c => ({
    sql: `
      INSERT INTO characters (name, anime, image_url, rarity, power, health, speed, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(name) DO UPDATE SET
        anime       = excluded.anime,
        image_url   = excluded.image_url,
        rarity      = excluded.rarity,
        power       = excluded.power,
        health      = excluded.health,
        speed       = excluded.speed,
        description = excluded.description
    `,
    args: [c.name, c.anime, c.image_url, c.rarity, c.power, c.health, c.speed, c.description ?? '']
  }));

  // Supprimer les persos retirés du JSON
  const names = chars.map(c => c.name);
  upsertQueries.push({
    sql:  `DELETE FROM characters WHERE name NOT IN (${names.map(() => '?').join(',')})`,
    args: names
  });

  await batch(upsertQueries);
  console.log(`[Gacha] ${chars.length} personnages synchronisés ✓`);
}

async function loadCharacterCache() {
  const chars = await all('SELECT * FROM characters');
  _characterCache = {};
  for (const char of chars) {
    if (!_characterCache[char.rarity]) _characterCache[char.rarity] = [];
    _characterCache[char.rarity].push(char);
  }
  const total = chars.length;
  console.log(`[Gacha] Cache chargé : ${total} personnages ✓`);
}

function findCharacter(search) {
  const q = search.toLowerCase().trim();

  const all = Object.values(_characterCache ?? {}).flat();

  // 1. MATCH EXACT (priorité absolue)
  const exact = all.find(c =>
    c.name.toLowerCase() === q
  );
  if (exact) return exact;

  // 2. MATCH "mot entier" (évite Goku vs Goku Black partiel)
  const wordMatch = all.find(c => {
    const name = c.name.toLowerCase();
    return name.split(' ').includes(q);
  });
  if (wordMatch) return wordMatch;

  // 3. MATCH CONTIENT MAIS SCORE (évite mauvais premier résultat)
  let best = null;
  let bestScore = 0;

  for (const c of all) {
    const name = c.name.toLowerCase();

    let score = 0;

    if (name.startsWith(q)) score += 3;
    if (name.includes(` ${q} `)) score += 5;
    if (name.includes(q)) score += 1;

    // bonus si même longueur proche
    score -= Math.abs(name.length - q.length) * 0.01;

    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }

  return best;
}

function getAllCharacters() {
  return Object.values(_characterCache ?? {}).flat();
}


function pickCharacter(rarity) {
  const pool = _characterCache?.[rarity] ?? [];
  if (pool.length > 0) return pool[Math.floor(Math.random() * pool.length)];

  // Fallback : toutes raretés confondues
  const all = Object.values(_characterCache ?? {}).flat();
  return all.length > 0 ? all[Math.floor(Math.random() * all.length)] : null;
}

// ── getOrCreateUser optimisé ───────────────────────────────────
async function getOrCreateUser(userId, guildId, username) {
  // INSERT OR IGNORE évite le SELECT conditionnel
  await run(
    'INSERT OR IGNORE INTO gacha_users (id, guild_id, username) VALUES (?, ?, ?)',
    userId, guildId, username
  );
  return await get(
    'SELECT * FROM gacha_users WHERE id = ? AND guild_id = ?',
    userId, guildId
  );
}


// ── Cooldown roll ──────────────────────────────────────────────
async function checkRollCooldown(user) {
  const now = Date.now();

  if (now > Number(user.roll_reset) * 1000) {
    await run(
      'UPDATE gacha_users SET roll_count = 0, roll_reset = ? WHERE id = ? AND guild_id = ?',
      Math.floor((now + ROLL_WINDOW_MS) / 1000), user.id, user.guild_id
    );
    user.roll_count = 0;
  }

  if (Number(user.roll_count) >= ROLL_LIMIT) {
    const remaining = Math.ceil((Number(user.roll_reset) * 1000 - now) / 1000 / 60);
    return { ok: false, reason: `Tu as utilisé tes ${ROLL_LIMIT} rolls. Réinitialisation dans **${remaining} min**.` };
  }

  return { ok: true, used: Number(user.roll_count), remaining: ROLL_LIMIT - Number(user.roll_count) };
}

// ── Cooldown claim ─────────────────────────────────────────────
function checkClaimCooldown(user) {
  const now = Date.now();
  if (user.last_claim && (now - Number(user.last_claim) * 1000) < CLAIM_CD_MS) {
    const remaining = Math.ceil((CLAIM_CD_MS - (now - Number(user.last_claim) * 1000)) / 1000 / 60);
    const hours     = Math.floor(remaining / 60);
    const minutes   = remaining % 60;
    return { ok: false, reason: `Tu peux claim à nouveau dans **${hours}h ${minutes}m**.` };
  }
  return { ok: true };
}

// ── Roll optimisé ──────────────────────────────────────────────
async function roll(userId, guildId, channelId, username) {
  const user    = await getOrCreateUser(userId, guildId, username);
  const cdCheck = await checkRollCooldown(user);
  if (!cdCheck.ok) return { ok: false, reason: cdCheck.reason };

  const rarity    = rollRarity();
  const character = pickCharacter(rarity); // ← mémoire, 0ms réseau
  if (!character) return { ok: false, reason: 'Aucun personnage disponible.' };

  const expiresAt = Math.floor((Date.now() + ROLL_EXPIRES_MS) / 1000);

  // Les deux écritures en un seul aller-retour
  const results = await batch([
    {
      sql:  'INSERT INTO active_rolls (guild_id, channel_id, character_id, rolled_by, expires_at) VALUES (?, ?, ?, ?, ?)',
      args: [guildId, channelId, character.id, userId, expiresAt],
    },
    {
      sql:  'UPDATE gacha_users SET roll_count = roll_count + 1, total_rolls = total_rolls + 1 WHERE id = ? AND guild_id = ?',
      args: [userId, guildId],
    },
  ]);

  return {
    ok:        true,
    rollId:    Number(results[0].lastInsertRowid),
    character,
    rarity:    RARITIES[character.rarity],
    rollsLeft: ROLL_LIMIT - Number(user.roll_count) - 1,
    expiresAt,
  };
}

// ── Claim ──────────────────────────────────────────────────────
async function claim(rollId, userId, guildId, username) {
  const user    = await getOrCreateUser(userId, guildId, username);
  const cdCheck = checkClaimCooldown(user);
  if (!cdCheck.ok) return { ok: false, reason: cdCheck.reason };

  const activeRoll = await get(`
    SELECT ar.*, c.name, c.anime, c.image_url, c.rarity,
           c.power, c.health, c.speed, c.description,
           c.id as character_id
    FROM active_rolls ar
    JOIN characters c ON c.id = ar.character_id
    WHERE ar.id = ? AND ar.guild_id = ?
    AND ar.claimed_by IS NULL
    AND ar.expires_at > unixepoch()
  `, rollId, guildId);

  if (!activeRoll) return { ok: false, reason: 'Ce personnage n\'est plus disponible (expiré ou déjà claim).' };

  // Transaction atomique via batch
  const results = await batch([
    {
      sql:  'UPDATE active_rolls SET claimed_by = ?, claimed_at = unixepoch() WHERE id = ?',
      args: [userId, rollId],
    },
    {
      sql:  'INSERT INTO user_cards (user_id, guild_id, character_id) VALUES (?, ?, ?)',
      args: [userId, guildId, activeRoll.character_id],
    },
    {
      sql:  'UPDATE gacha_users SET last_claim = unixepoch(), total_claims = total_claims + 1 WHERE id = ? AND guild_id = ?',
      args: [userId, guildId],
    },
  ]);

  const cardId = Number(results[1].lastInsertRowid);

  return {
    ok: true,
    cardId,
    character: {
      id:          activeRoll.character_id,
      name:        activeRoll.name,
      anime:       activeRoll.anime,
      image_url:   activeRoll.image_url,
      rarity:      activeRoll.rarity,
      power:       activeRoll.power,
      health:      activeRoll.health,
      speed:       activeRoll.speed,
      description: activeRoll.description,
    },
    rarity: RARITIES[activeRoll.rarity],
  };
}

// ── Nettoyage des rolls expirés ────────────────────────────────
async function cleanExpiredRolls() {
  const result = await run(
    'DELETE FROM active_rolls WHERE expires_at < unixepoch() AND claimed_by IS NULL'
  );
  if (result.changes > 0) console.log(`[Gacha] ${result.changes} roll(s) expiré(s) supprimé(s)`);
}

module.exports = {
  seedCharacters, loadCharacterCache,
  roll, claim,
  getOrCreateUser, checkRollCooldown, checkClaimCooldown,
  cleanExpiredRolls, ROLL_LIMIT,
  findCharacter, getAllCharacters, // ← nouveau
};