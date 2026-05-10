const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { proposeTrade, acceptTrade, declineTrade, getPendingTrade } = require('../systems/collection/trading');
const { getCard } = require('../systems/collection/inventory');
const { RARITIES } = require('../systems/gacha/drops');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trade')
    .setDescription('Système d\'échange de cartes')
    .addSubcommand(sub =>
      sub.setName('propose')
         .setDescription('Proposer un échange')
         .addUserOption(o => o.setName('joueur').setDescription('Joueur cible').setRequired(true))
         .addIntegerOption(o => o.setName('ta_carte').setDescription('ID de ta carte à échanger').setRequired(true))
         .addIntegerOption(o => o.setName('sa_carte').setDescription('ID de sa carte souhaitée').setRequired(true))
    )
    .addSubcommand(sub => sub.setName('accept').setDescription('Accepter l\'échange en attente'))
    .addSubcommand(sub => sub.setName('decline').setDescription('Refuser l\'échange en attente')),

  name: 'trade',

  async execute(ctx) {
    await ctx.defer();
    const sub = ctx.source.options.getSubcommand();

    if (sub === 'propose') {
      const target      = ctx.source.options.getUser('joueur');
      const myCardId    = ctx.source.options.getInteger('ta_carte');
      const theirCardId = ctx.source.options.getInteger('sa_carte');

      if (target.id === ctx.user.id) return ctx.editReply('❌ Tu ne peux pas échanger avec toi-même.');
      if (target.bot)               return ctx.editReply('❌ Impossible d\'échanger avec un bot.');

      const myCard    = getCard(myCardId,    ctx.user.id,  ctx.guild.id);
      const theirCard = getCard(theirCardId, target.id,    ctx.guild.id);

      if (!myCard)    return ctx.editReply(`❌ Tu ne possèdes pas la carte #${myCardId}.`);
      if (!theirCard) return ctx.editReply(`❌ **${target.username}** ne possède pas la carte #${theirCardId}.`);

      const result = proposeTrade(ctx.user.id, target.id, myCardId, theirCardId, ctx.guild.id);
      if (!result.ok) return ctx.editReply(`❌ ${result.reason}`);

      const embed = new EmbedBuilder()
        .setTitle('🔄 Proposition d\'échange')
        .setColor(0x3498db)
        .addFields(
          { name: `📤 ${ctx.user.username} offre`,    value: `${RARITIES[myCard.rarity].emoji} **${myCard.name}** \`#${myCardId}\``,     inline: true },
          { name: `📥 ${target.username} donne`,      value: `${RARITIES[theirCard.rarity].emoji} **${theirCard.name}** \`#${theirCardId}\``, inline: true },
        )
        .setFooter({ text: `Trade #${result.tradeId} • ${target.username} : utilise /trade accept ou /trade decline` });

      return ctx.editReply({ content: `<@${target.id}>`, embeds: [embed] });
    }

    if (sub === 'accept') {
      const pending = getPendingTrade(ctx.user.id, ctx.guild.id);
      if (!pending) return ctx.editReply('❌ Aucun échange en attente.');
      if (pending.receiver_id !== ctx.user.id) return ctx.editReply('❌ Ce n\'est pas toi qui dois accepter cet échange.');

      const result = acceptTrade(pending.id, ctx.user.id, ctx.guild.id);
      if (!result.ok) return ctx.editReply(`❌ ${result.reason}`);

      return ctx.editReply('✅ Échange accepté ! Les cartes ont été échangées.');
    }

    if (sub === 'decline') {
      const pending = getPendingTrade(ctx.user.id, ctx.guild.id);
      if (!pending) return ctx.editReply('❌ Aucun échange en attente.');

      declineTrade(pending.id, ctx.user.id, ctx.guild.id);
      return ctx.editReply('❌ Échange refusé.');
    }
  },
};