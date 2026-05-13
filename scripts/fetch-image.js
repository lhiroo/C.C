const db   = require('../db/database');
const { get, all, run, batch } = require('../db/query')
const fs   = require('fs');
const path = require('path');
const https = require('https');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Helpers HTTP ─────────────────────────────────────────────────
function httpPost(hostname, pathStr, body) {
  return new Promise((resolve) => {
    const options = {
      hostname, path: pathStr, method: 'POST',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
      }
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(null); } });
    });
    req.on('error', () => resolve(null));
    req.write(body);
    req.end();
  });
}

function httpGet(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'GachaBot/1.0' } }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(null); } });
    }).on('error', () => resolve(null));
  });
}

// ── Source 1 : AniList — multi-candidats + validation ────────────
async function fetchFromAnilist(name, anime) {

  // Stratégie 1 : chercher dans le contexte de l'anime (le plus fiable)
  const bodyScoped = JSON.stringify({
    query: `
      query ($anime: String, $char: String) {
        Media(search: $anime, type: ANIME) {
          characters(search: $char, perPage: 3) {
            nodes {
              name { full }
              image { large }
            }
          }
        }
      }
    `,
    variables: { anime, char: name }
  });

  const json1      = await httpPost('graphql.anilist.co', '/', bodyScoped);
  const candidates = json1?.data?.Media?.characters?.nodes || [];

  if (candidates.length > 0) {

  const normalize = str =>
    str.toLowerCase()
      .replace(/[^a-z0-9]/g, '');

  const target = normalize(name);

  // Match exact prioritaire
  const exact = candidates.find(c =>
    normalize(c.name.full) === target
  );

  if (exact) {
    return exact.image.large;
  }

  // Match partiel ensuite
  const partial = candidates.find(c =>
    normalize(c.name.full).includes(target) ||
    target.includes(normalize(c.name.full))
  );

  if (partial) {
    return partial.image.large;
  }

  // Sinon premier résultat
  return candidates[0].image.large;
}
  // Stratégie 2 : recherche globale avec validation par anime
  const bodyGlobal = JSON.stringify({
    query: `
      query ($search: String) {
        Page(perPage: 5) {
          characters(search: $search) {
            name { full }
            image { large }
            media(type: ANIME, perPage: 5) {
              nodes { title { romaji english native } }
            }
          }
        }
      }
    `,
    variables: { search: name }
  });

  const json2    = await httpPost('graphql.anilist.co', '/', bodyGlobal);
  const results  = json2?.data?.Page?.characters || [];
  const animeLow = anime.toLowerCase();

  for (const char of results) {
    const titles = char.media?.nodes?.flatMap(m => [
      m.title?.romaji,
      m.title?.english,
      m.title?.native,
    ]).filter(Boolean).map(t => t.toLowerCase());

    const matches = titles?.some(t =>
      t.includes(animeLow) || animeLow.includes(t)
    );

    if (matches) return char.image.large;
  }

  // Stratégie 3 : premier résultat global (dernier recours)
  return results[0]?.image?.large || null;
}

// ── Source 2 : Jikan (MyAnimeList) — fallback ────────────────────
async function fetchFromJikan(name, anime) {
  const encoded = encodeURIComponent(name);
  const json    = await httpGet(`https://api.jikan.moe/v4/characters?q=${encoded}&limit=5`);
  const results = json?.data || [];

  for (const char of results) {
    const hasAnime = char.anime?.some(a =>
      a.anime?.title?.toLowerCase().includes(anime.toLowerCase())
    );
    if (hasAnime) return char.images?.jpg?.image_url || null;
  }

  // Fallback : premier résultat Jikan
  return results[0]?.images?.jpg?.image_url || null;
}

// ── Orchestrateur ────────────────────────────────────────────────
async function fetchImage(name, anime) {
  const url = await fetchFromAnilist(name, anime);
  if (url) return { url, source: 'AniList' };

  await sleep(500);
  const url2 = await fetchFromJikan(name, anime);
  if (url2) return { url: url2, source: 'Jikan' };

  return null;
}

// ── Script principal ─────────────────────────────────────────────
async function run() {
  console.log('[fetchImages] Démarrage...\n');

  // Pour ne mettre à jour que les placeholders/manquants :
  /*const chars = db.prepare(`
    SELECT id, name, anime, image_url FROM characters
    WHERE image_url LIKE '%placehold%'
       OR image_url LIKE '%pinimg%'
       OR image_url IS NULL
       OR image_url = ''
  `).all();*/

  // Pour forcer la mise à jour de TOUS les personnages, remplace par :
  const chars = db.prepare('SELECT id, name, anime, image_url FROM characters').all();

  console.log(`[fetchImages] ${chars.length} personnage(s) à mettre à jour\n`);

  let success = 0, failed = 0;
  const notFound = [];

  for (const char of chars) {
    process.stdout.write(`  → ${char.name} (${char.anime})... `);

    const result = await fetchImage(char.name, char.anime);

    if (result) {
      db.prepare('UPDATE characters SET image_url = ? WHERE id = ?').run(result.url, char.id);
      console.log(`✅ [${result.source}]`);
      success++;
    } else {
      console.log(`❌ (non trouvé)`);
      notFound.push({ name: char.name, anime: char.anime });
      failed++;
    }

    // AniList = 90 req/min, Jikan = 3 req/s → 800ms safe pour les deux
    await sleep(800);
  }

  // ── Sync JSON ────────────────────────────────────────────────────
  const allChars = db.prepare('SELECT * FROM characters').all();
  const jsonPath  = path.join(process.cwd(), 'data', 'characters.json');
  fs.writeFileSync(jsonPath, JSON.stringify(allChars.map(c => ({
    name:        c.name,
    anime:       c.anime,
    image_url:   c.image_url,
    rarity:      c.rarity,
    power:       c.power,
    health:      c.health,
    speed:       c.speed,
    description: c.description,
  })), null, 2));

  console.log(`\n[fetchImages] ✅ ${success} trouvée(s) · ❌ ${failed} non trouvée(s)`);

  if (notFound.length > 0) {
    console.log('\n[fetchImages] Personnages à renseigner manuellement :');
    notFound.forEach(c => console.log(`  - ${c.name} (${c.anime})`));
  }

  console.log('[fetchImages] characters.json mis à jour');
  process.exit(0);
}

run();