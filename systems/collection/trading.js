const { get, run, batch } = require('../../db/query');

async function proposeTrade(senderId, receiverId, senderCardId, receiverCardId, guildId) {
  const senderCard = await get(
    'SELECT * FROM user_cards WHERE id = ? AND user_id = ? AND guild_id = ?',
    senderCardId, senderId, guildId
  );
  const receiverCard = await get(
    'SELECT * FROM user_cards WHERE id = ? AND user_id = ? AND guild_id = ?',
    receiverCardId, receiverId, guildId
  );

  if (!senderCard)   return { ok: false, reason: 'Tu ne possèdes pas cette carte.' };
  if (!receiverCard) return { ok: false, reason: 'Le destinataire ne possède pas cette carte.' };

  await run(`
    UPDATE trades SET status = 'cancelled'
    WHERE guild_id = ? AND status = 'pending'
    AND (sender_id = ? OR receiver_id = ? OR sender_id = ? OR receiver_id = ?)
  `, guildId, senderId, senderId, receiverId, receiverId);

  const result = await run(
    'INSERT INTO trades (guild_id, sender_id, receiver_id, sender_card_id, receiver_card_id) VALUES (?, ?, ?, ?, ?)',
    guildId, senderId, receiverId, senderCardId, receiverCardId
  );

  return { ok: true, tradeId: result.lastInsertRowid };
}

async function acceptTrade(tradeId, receiverId, guildId) {
  const trade = await get(
    `SELECT * FROM trades WHERE id = ? AND guild_id = ? AND receiver_id = ? AND status = 'pending'`,
    tradeId, guildId, receiverId
  );

  if (!trade) return { ok: false, reason: 'Échange introuvable ou déjà traité.' };

  await batch([
    { sql: 'UPDATE user_cards SET user_id = ? WHERE id = ?', args: [trade.receiver_id, trade.sender_card_id]   },
    { sql: 'UPDATE user_cards SET user_id = ? WHERE id = ?', args: [trade.sender_id,   trade.receiver_card_id] },
    // ← updated_at retiré
    { sql: `UPDATE trades SET status = 'accepted' WHERE id = ?`, args: [tradeId] },
  ]);

  return { ok: true, trade };
}

async function declineTrade(tradeId, userId, guildId) {
  const result = await run(`
    UPDATE trades SET status = 'declined'
    WHERE id = ? AND guild_id = ? AND (sender_id = ? OR receiver_id = ?) AND status = 'pending'
  `, tradeId, guildId, userId, userId);

  return result.changes > 0
    ? { ok: true }
    : { ok: false, reason: 'Échange introuvable.' };
}

async function getPendingTrade(userId, guildId) {
  return get(`
    SELECT t.*
    FROM trades t
    WHERE t.guild_id = ? AND (t.sender_id = ? OR t.receiver_id = ?) AND t.status = 'pending'
    LIMIT 1
  `, guildId, userId, userId);
}

module.exports = { proposeTrade, acceptTrade, declineTrade, getPendingTrade };