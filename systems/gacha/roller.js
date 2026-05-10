const db               = require('../../db/database');
const { rollRarity, RARITIES } = require('./drops');
const path             = require('path');
const fs               = require('fs');

const ROLL_LIMIT      = 10;          // rolls max par heure
const ROLL_WINDOW_MS  = 60 * 60 * 1000; // 1 heure
const CLAIM_CD_MS     = 3 * 60 * 60 * 1000; // 3 heures
const ROLL_EXPIRES_MS = 60 * 1000;  // le roll expire après 60s

// Charger et seed les personnages en BDD au démarrage
function seedCharacters() {
  const count = db.prepare('SELECT COUNT(*) as n FROM characters').get().n;
  if (count > 0) return;

  const chars    = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'data', 'characters.json'), 'utf-8')
  );
  const insert = db.prepare(`
    INSERT INTO characters (name, anime, image_url, rarity, power, health, speed, description)
    VALUES (@name, @anime, @image_url, @rarity, @power, @health, @speed, @description)
  `);

  const insertMany = db.transaction(chars => {
    for (const c of chars) insert.run(c);
  });
  insertMany(chars);
  console.log(`[Gacha] ${chars.length} personnages chargés en BDD`);
}

// Récupérer ou créer un utilisateur gacha
function getOrCreateUser(userId, guildId, username) {
  let user = db.prepare('SELECT * FROM gacha_users WHERE id = ? AND guild_id = ?').get(userId, guildId);
  if (!user) {
    db.prepare(`
      INSERT INTO gacha_users (id, guild_id, username)
      VALUES (?, ?, ?)
    `).run(userId, guildId, username);
    user = db.prepare('SELECT * FROM gacha_users WHERE id = ? AND guild_id = ?').get(userId, guildId);
  }
  return user;
}

// Vérifier et gérer le cooldown de roll
function checkRollCooldown(user) {
  const now = Date.now();

  // Réinitialiser le compteur si la fenêtre est expirée
  if (now > user.roll_reset) {
    db.prepare(`
      UPDATE gacha_users SET roll_count = 0, roll_reset = ? WHERE id = ? AND guild_id = ?
    `).run(now + ROLL_WINDOW_MS, user.id, user.guild_id);
    user.roll_count = 0;
    user.roll_reset = now + ROLL_WINDOW_MS;
  }

  if (user.roll_count >= ROLL_LIMIT) {
    const remaining = Math.ceil((user.roll_reset - now) / 1000 / 60);
    return { ok: false, remaining, reason: `Tu as utilisé tes ${ROLL_LIMIT} rolls. Réinitialisation dans **${remaining} min**.` };
  }

  return { ok: true, used: user.roll_count, remaining: ROLL_LIMIT - user.roll_count };
}

// Vérifier le cooldown de claim
function checkClaimCooldown(user) {
  const now = Date.now();
  if (user.last_claim && (now - user.last_claim * 1000) < CLAIM_CD_MS) {
    const remaining = Math.ceil((CLAIM_CD_MS - (now - user.last_claim * 1000)) / 1000 / 60);
    const hours   = Math.floor(remaining / 60);
    const minutes = remaining % 60;
    return {
      ok: false,
      remaining,
      reason: `Tu peux claim à nouveau dans **${hours}h ${minutes}m**.`,
    };
  }
  return { ok: true };
}

// Effectuer un roll
function roll(userId, guildId, channelId, username) {
  const user   = getOrCreateUser(userId, guildId, username);
  const cdCheck = checkRollCooldown(user);
  if (!cdCheck.ok) return { ok: false, reason: cdCheck.reason };

  // Tirer une rareté puis un personnage de cette rareté
  const rarity     = rollRarity();
  const characters = db.prepare(
    'SELECT * FROM characters WHERE rarity = ? ORDER BY RANDOM() LIMIT 1'
  ).get(rarity);

  // Fallback si aucun perso de cette rareté
  const character = characters ?? db.prepare(
    'SELECT * FROM characters ORDER BY RANDOM() LIMIT 1'
  ).get();

  if (!character) return { ok: false, reason: 'Aucun personnage disponible.' };

  // Créer le roll actif (expire dans 60s)
  const expiresAt = Math.floor((Date.now() + ROLL_EXPIRES_MS) / 1000);

  const rollId = db.prepare(`
    INSERT INTO active_rolls (guild_id, channel_id, character_id, rolled_by, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(guildId, channelId, character.id, userId, expiresAt).lastInsertRowid;

  // Incrémenter le compteur
  db.prepare(`
    UPDATE gacha_users
    SET roll_count = roll_count + 1, total_rolls = total_rolls + 1
    WHERE id = ? AND guild_id = ?
  `).run(userId, guildId);

  return {
    ok: true,
    rollId,
    character,
    rarity: RARITIES[character.rarity],
    rollsLeft: ROLL_LIMIT - user.roll_count - 1,
    expiresAt,
  };
}

// Claim un personnage
function claim(rollId, userId, guildId, username) {
  const user    = getOrCreateUser(userId, guildId, username);
  const cdCheck = checkClaimCooldown(user);
  if (!cdCheck.ok) return { ok: false, reason: cdCheck.reason };

  const activeRoll = db.prepare(`
    SELECT ar.*, c.* FROM active_rolls ar
    JOIN characters c ON c.id = ar.character_id
    WHERE ar.id = ? AND ar.guild_id = ? AND ar.claimed_by IS NULL
    AND ar.expires_at > unixepoch()
  `).get(rollId, guildId);

  if (!activeRoll) return { ok: false, reason: 'Ce personnage n\'est plus disponible (expiré ou déjà claim).' };

  // Transaction atomique : claim + ajout à la collection
  const claimTransaction = db.transaction(() => {
    db.prepare(`
      UPDATE active_rolls SET claimed_by = ?, claimed_at = unixepoch()
      WHERE id = ?
    `).run(userId, rollId);

    const cardId = db.prepare(`
      INSERT INTO user_cards (user_id, guild_id, character_id)
      VALUES (?, ?, ?)
    `).run(userId, guildId, activeRoll.character_id).lastInsertRowid;

    db.prepare(`
      UPDATE gacha_users
      SET last_claim = unixepoch(), total_claims = total_claims + 1
      WHERE id = ? AND guild_id = ?
    `).run(userId, guildId);

    return cardId;
  });

  const cardId = claimTransaction();

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

// Nettoyer les rolls expirés (à appeler périodiquement)
function cleanExpiredRolls() {
  const deleted = db.prepare(
    'DELETE FROM active_rolls WHERE expires_at < unixepoch() AND claimed_by IS NULL'
  ).run().changes;
  if (deleted > 0) console.log(`[Gacha] ${deleted} roll(s) expiré(s) supprimé(s)`);
}

module.exports = { seedCharacters, roll, claim, getOrCreateUser, checkRollCooldown, checkClaimCooldown, cleanExpiredRolls, ROLL_LIMIT };