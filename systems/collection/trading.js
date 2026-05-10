const db = require('../../db/database');

function proposeTrade(senderId, receiverId, senderCardId, receiverCardId, guildId) {
  // Vérifier que les cartes appartiennent bien aux bons joueurs
  const senderCard   = db.prepare('SELECT * FROM user_cards WHERE id = ? AND user_id = ? AND guild_id = ?').get(senderCardId,   senderId,   guildId);
  const receiverCard = db.prepare('SELECT * FROM user_cards WHERE id = ? AND user_id = ? AND guild_id = ?').get(receiverCardId, receiverId, guildId);

  if (!senderCard)   return { ok: false, reason: 'Tu ne possèdes pas cette carte.' };
  if (!receiverCard) return { ok: false, reason: 'Le destinataire ne possède pas cette carte.' };

  // Annuler les trades en attente des deux joueurs
  db.prepare(`
    UPDATE trades SET status = 'cancelled'
    WHERE guild_id = ? AND status = 'pending'
    AND (sender_id = ? OR receiver_id = ? OR sender_id = ? OR receiver_id = ?)
  `).run(guildId, senderId, senderId, receiverId, receiverId);

  const tradeId = db.prepare(`
    INSERT INTO trades (guild_id, sender_id, receiver_id, sender_card_id, receiver_card_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(guildId, senderId, receiverId, senderCardId, receiverCardId).lastInsertRowid;

  return { ok: true, tradeId };
}

function acceptTrade(tradeId, receiverId, guildId) {
  const trade = db.prepare(`
    SELECT * FROM trades WHERE id = ? AND guild_id = ? AND receiver_id = ? AND status = 'pending'
  `).get(tradeId, guildId, receiverId);

  if (!trade) return { ok: false, reason: 'Échange introuvable ou déjà traité.' };

  const doTrade = db.transaction(() => {
    // Échanger les propriétaires des cartes
    db.prepare('UPDATE user_cards SET user_id = ? WHERE id = ?').run(trade.receiver_id, trade.sender_card_id);
    db.prepare('UPDATE user_cards SET user_id = ? WHERE id = ?').run(trade.sender_id,   trade.receiver_card_id);
    db.prepare(`UPDATE trades SET status = 'accepted', updated_at = unixepoch() WHERE id = ?`).run(tradeId);
  });

  doTrade();
  return { ok: true, trade };
}

function declineTrade(tradeId, userId, guildId) {
  const result = db.prepare(`
    UPDATE trades SET status = 'declined', updated_at = unixepoch()
    WHERE id = ? AND guild_id = ? AND (sender_id = ? OR receiver_id = ?) AND status = 'pending'
  `).run(tradeId, guildId, userId, userId);

  return result.changes > 0 ? { ok: true } : { ok: false, reason: 'Échange introuvable.' };
}

function getPendingTrade(userId, guildId) {
  return db.prepare(`
    SELECT t.*,
           sc.character_id as sender_char_id,
           rc.character_id as receiver_char_id
    FROM trades t
    JOIN user_cards sc ON sc.id = t.sender_card_id
    JOIN user_cards rc ON rc.id = t.receiver_card_id
    WHERE t.guild_id = ? AND (t.sender_id = ? OR t.receiver_id = ?) AND t.status = 'pending'
    LIMIT 1
  `).get(guildId, userId, userId);
}

module.exports = { proposeTrade, acceptTrade, declineTrade, getPendingTrade };