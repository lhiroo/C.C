const { createClient } = require('@libsql/client');
const fs   = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config();

const db = createClient(
  process.env.TURSO_URL
    ? { url: process.env.TURSO_URL, authToken: process.env.TURSO_TOKEN }
    : { url: `file:${path.join(process.cwd(), 'data', 'ccbot.db')}` }
);

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Source 1 : AniList GraphQL ─────────────────────────────────
function fetchAnilist(name) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      query: `query ($search: String) { Character(search: $search) { image { large } } }`,
      variables: { search: name },
    });

    const req = https.request({
      hostname: 'graphql.anilist.co',
      path:     '/',
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json?.data?.Character?.image?.large ?? null);
        } catch { resolve(null); }
      });
    });

    req.on('error', () => resolve(null));
    req.write(body);
    req.end();
  });
}

// ── Source 2 : Jikan (MyAnimeList) ────────────────────────────
function fetchJikan(name) {
  return new Promise((resolve) => {
    const encoded = encodeURIComponent(name);

    const req = https.request({
      hostname: 'api.jikan.moe',
      path:     `/v4/characters?q=${encoded}&limit=1`,
      method:   'GET',
      headers:  { 'Accept': 'application/json' },
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const img  = json?.data?.[0]?.images?.jpg?.image_url ?? null;
          resolve(img);
        } catch { resolve(null); }
      });
    });

    req.on('error', () => resolve(null));
    req.end();
  });
}

// ── Fetch avec fallback ────────────────────────────────────────
async function fetchImage(name) {
  // 1. Essayer AniList
  const anilistUrl = await fetchAnilist(name);
  if (anilistUrl) return { url: anilistUrl, source: 'AniList' };

  // Petit délai avant le fallback pour ne pas flood
  await sleep(300);

  // 2. Fallback Jikan (MAL)
  const jikanUrl = await fetchJikan(name);
  if (jikanUrl) return { url: jikanUrl, source: 'Jikan' };

  return null;
}

async function run() {
  console.log('[fetchImages] Connexion...\n');

  const result = await db.execute(`
    SELECT id, name, anime, image_url FROM characters
    WHERE image_url LIKE 'PLACEHOLDER'
  `);

  const chars = result.rows;
  console.log(`[fetchImages] ${chars.length} personnage(s) à mettre à jour\n`);

  if (chars.length === 0) {
    console.log('[fetchImages] Toutes les images sont déjà à jour !');
    process.exit(0);
  }

  let success  = 0;
  let failed   = 0;
  const failedList = [];

  for (const char of chars) {
    process.stdout.write(`  → ${char.name} (${char.anime})... `);

    const found = await fetchImage(char.name);

    if (found) {
      await db.execute({
        sql:  'UPDATE characters SET image_url = ? WHERE id = ?',
        args: [found.url, char.id],
      });
      console.log(`✅ [${found.source}]`);
      success++;
    } else {
      console.log('❌ non trouvé');
      failed++;
      failedList.push(`${char.name} (${char.anime})`);
    }

    // AniList : 90 req/min → 700ms entre chaque
    // Jikan   : 3 req/sec  → déjà respecté avec le délai AniList
    await sleep(700);
  }

  // Mettre à jour characters.json
  const allChars = await db.execute('SELECT * FROM characters ORDER BY rarity, name');
  const jsonData  = allChars.rows.map(c => ({
    name:        c.name,
    anime:       c.anime,
    image_url:   c.image_url,
    rarity:      c.rarity,
    power:       Number(c.power),
    health:      Number(c.health),
    speed:       Number(c.speed),
    description: c.description,
  }));

  fs.writeFileSync(
    path.join(process.cwd(), 'data', 'characters.json'),
    JSON.stringify(jsonData, null, 2)
  );

  console.log(`\n─────────────────────────────────`);
  console.log(`✅ Succès  : ${success}`);
  console.log(`❌ Échecs  : ${failed}`);

  if (failedList.length > 0) {
    console.log(`\nPersonnages sans image :`);
    failedList.forEach(n => console.log(`  - ${n}`));
    console.log(`\nAstuce : vérifie l'orthographe exacte sur https://anilist.co ou https://myanimelist.net`);
  }

  console.log(`\n[fetchImages] characters.json mis à jour ✓`);
  process.exit(0);
}

run().catch(err => {
  console.error('[fetchImages] Erreur fatale:', err);
  process.exit(1);
});