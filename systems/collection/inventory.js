const db             = require('../../db/database');
const { RARITIES }   = require('../gacha/drops');

const PAGE_SIZE = 10;

function getCollection(userId, guildId, page = 1, rarityFilter = null) {
  const offset = (page - 1) * PAGE_SIZE;

  let query = `
    SELECT uc.id as card_id, uc.obtained_at, uc.is_favorite,
           c.name, c.anime, c.image_url, c.rarity, c.power, c.health, c.speed
    FROM user_cards uc
    JOIN characters c ON c.id = uc.character_id
    WHERE uc.user_id = ? AND uc.guild_id = ?
  `;
  const params = [userId, guildId];

  if (rarityFilter) {
    query += ' AND c.rarity = ?';
    params.push(rarityFilter);
  }

  query += ' ORDER BY uc.is_favorite DESC, c.rarity DESC, uc.obtained_at DESC LIMIT ? OFFSET ?';
  params.push(PAGE_SIZE, offset);

  const cards = db.prepare(query).all(...params);

  const countQuery = rarityFilter
    ? 'SELECT COUNT(*) as n FROM user_cards uc JOIN characters c ON c.id = uc.character_id WHERE uc.user_id = ? AND uc.guild_id = ? AND c.rarity = ?'
    : 'SELECT COUNT(*) as n FROM user_cards WHERE user_id = ? AND guild_id = ?';

  const countParams = rarityFilter ? [userId, guildId, rarityFilter] : [userId, guildId];
  const total = db.prepare(countQuery).get(...countParams).n;

  return { cards, total, page, totalPages: Math.ceil(total / PAGE_SIZE) };
}

function getProfile(userId, guildId) {
  const user = db.prepare('SELECT * FROM gacha_users WHERE id = ? AND guild_id = ?').get(userId, guildId);
  if (!user) return null;

  const stats = db.prepare(`
    SELECT c.rarity, COUNT(*) as count
    FROM user_cards uc
    JOIN characters c ON c.id = uc.character_id
    WHERE uc.user_id = ? AND uc.guild_id = ?
    GROUP BY c.rarity
  `).all(userId, guildId);

  const best = db.prepare(`
    SELECT c.* FROM user_cards uc
    JOIN characters c ON c.id = uc.character_id
    WHERE uc.user_id = ? AND uc.guild_id = ?
    ORDER BY c.power DESC LIMIT 1
  `).get(userId, guildId);

  const total = db.prepare(
    'SELECT COUNT(*) as n FROM user_cards WHERE user_id = ? AND guild_id = ?'
  ).get(userId, guildId).n;

  return { user, stats, best, total };
}

function getCard(cardId, userId, guildId) {
  return db.prepare(`
    SELECT uc.id as card_id, uc.obtained_at, uc.is_favorite,
           c.name, c.anime, c.image_url, c.rarity, c.power, c.health, c.speed, c.description
    FROM user_cards uc
    JOIN characters c ON c.id = uc.character_id
    WHERE uc.id = ? AND uc.user_id = ? AND uc.guild_id = ?
  `).get(cardId, userId, guildId);
}

function toggleFavorite(cardId, userId, guildId) {
  const card = getCard(cardId, userId, guildId);
  if (!card) return false;
  db.prepare('UPDATE user_cards SET is_favorite = NOT is_favorite WHERE id = ?').run(cardId);
  return true;
}

function getLeaderboard(guildId, limit = 10) {
  return db.prepare(`
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
  `).all(guildId, limit);
}

module.exports = { getCollection, getProfile, getCard, toggleFavorite, getLeaderboard };