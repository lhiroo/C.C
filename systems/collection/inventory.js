const { get, all, run } = require('../../db/query');
const { RARITIES }      = require('../gacha/drops');

const PAGE_SIZE = 10;

async function getCollection(userId, guildId, page = 1, rarityFilter = null) {
  const safePage = (Number.isInteger(page) && page > 0) ? page : 1;
  const offset   = (safePage - 1) * PAGE_SIZE;

  let sql    = `
    SELECT uc.id as card_id, uc.obtained_at, uc.is_favorite,
           c.name, c.anime, c.image_url, c.rarity, c.power, c.health, c.speed
    FROM user_cards uc
    JOIN characters c ON c.id = uc.character_id
    WHERE uc.user_id = ? AND uc.guild_id = ?
  `;
  const params = [userId, guildId];

  if (rarityFilter) {
    sql += ' AND c.rarity = ?';
    params.push(rarityFilter);
  }

  sql += ' ORDER BY uc.is_favorite DESC, c.power DESC, uc.obtained_at DESC LIMIT ? OFFSET ?';
  params.push(PAGE_SIZE, offset);

  const cards = await all(sql, ...params);

  const countSql = rarityFilter
    ? 'SELECT COUNT(*) as n FROM user_cards uc JOIN characters c ON c.id = uc.character_id WHERE uc.user_id = ? AND uc.guild_id = ? AND c.rarity = ?'
    : 'SELECT COUNT(*) as n FROM user_cards WHERE user_id = ? AND guild_id = ?';

  const countParams = rarityFilter ? [userId, guildId, rarityFilter] : [userId, guildId];
  const countRow    = await get(countSql, ...countParams);
  const total       = Number(countRow?.n ?? 0);

  return { cards, total, page: safePage, totalPages: Math.ceil(total / PAGE_SIZE) || 1 };
}

async function getProfile(userId, guildId) {
  const user = await get(
    'SELECT * FROM gacha_users WHERE id = ? AND guild_id = ?',
    userId, guildId
  );
  if (!user) return null;

  const stats = await all(`
    SELECT c.rarity, COUNT(*) as count
    FROM user_cards uc
    JOIN characters c ON c.id = uc.character_id
    WHERE uc.user_id = ? AND uc.guild_id = ?
    GROUP BY c.rarity
  `, userId, guildId);

  const best = await get(`
    SELECT c.* FROM user_cards uc
    JOIN characters c ON c.id = uc.character_id
    WHERE uc.user_id = ? AND uc.guild_id = ?
    ORDER BY c.power DESC LIMIT 1
  `, userId, guildId);

  const totalRow = await get(
    'SELECT COUNT(*) as n FROM user_cards WHERE user_id = ? AND guild_id = ?',
    userId, guildId
  );

  return { user, stats, best, total: Number(totalRow?.n ?? 0) };
}

async function getCard(cardId, userId, guildId) {
  return get(`
    SELECT uc.id as card_id, uc.obtained_at, uc.is_favorite,
           c.name, c.anime, c.image_url, c.rarity,
           c.power, c.health, c.speed, c.description
    FROM user_cards uc
    JOIN characters c ON c.id = uc.character_id
    WHERE uc.id = ? AND uc.user_id = ? AND uc.guild_id = ?
  `, cardId, userId, guildId);
}

async function toggleFavorite(cardId, userId, guildId) {
  const card = await getCard(cardId, userId, guildId);
  if (!card) return false;
  await run('UPDATE user_cards SET is_favorite = NOT is_favorite WHERE id = ?', cardId);
  return true;
}

async function getLeaderboard(guildId, limit = 10) {
  return all(`
    SELECT gu.id, gu.username,
           COUNT(uc.id) as total_cards,
           gu.total_rolls, gu.total_claims,
           MAX(c.power) as best_power
    FROM gacha_users gu
    LEFT JOIN user_cards uc ON uc.user_id = gu.id AND uc.guild_id = gu.guild_id
    LEFT JOIN characters c  ON c.id = uc.character_id
    WHERE gu.guild_id = ?
    GROUP BY gu.id
    ORDER BY total_cards DESC, best_power DESC
    LIMIT ?
  `, guildId, limit);
}

module.exports = { getCollection, getProfile, getCard, toggleFavorite, getLeaderboard };