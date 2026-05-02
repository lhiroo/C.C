const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const UNITES = { s: 1000, m: 60000, h: 3600000, j: 86400000 };

function parseDuree(str) {
  const match = str.match(/^(\d+)(s|m|h|j)$/);
  if (!match) return null;
  return parseInt(match[1]) * UNITES[match[2]];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Lance un giveaway')
    .addStringOption(o => o.setName('lot').setDescription('Ce qui est mis en jeu').setRequired(true))
    .addStringOption(o => o.setName('duree').setDescription('Durée (ex: 1h, 30m)').setRequired(true))
    .addIntegerOption(o => o.setName('gagnants').setDescription('Nombre de gagnants').setMinValue(1).setMaxValue(10))
    .addChannelOption(o => o.setName('salon').setDescription('Salon (actuel par défaut)'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  name: 'giveaway',

  async execute(ctx) {

    if (!ctx.source?.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      const confirmation = await ctx.reply(
        "❌ Tu n'as pas les permissions nécessaires."
      );

      setTimeout(() => {
        confirmation.delete().catch(() => {});
      }, 4000);

      return;
    }

    await ctx.defer({ ephemeral: true });

    const lot       = ctx.isSlash ? ctx.source.options.getString('lot')          : ctx.args.join(' ');
    const dureeStr  = ctx.isSlash ? ctx.source.options.getString('duree')         : '1h';
    const nbGagnant = ctx.isSlash ? (ctx.source.options.getInteger('gagnants') ?? 1) : 1;
    const salon     = ctx.isSlash ? (ctx.source.options.getChannel('salon') ?? ctx.channel) : ctx.channel;

    const ms  = parseDuree(dureeStr);
    if (!ms)  return ctx.editReply('❌ Durée invalide. Exemple : `1h`, `30m`, `2j`');

    const fin = Math.floor((Date.now() + ms) / 1000);

    const embed = new EmbedBuilder()
      .setTitle(`🎉 GIVEAWAY — ${lot}`)
      .setDescription(
        `Réagis avec 🎉 pour participer !\n\n` +
        `⏰ Fin : <t:${fin}:R>\n` +
        `🏆 Gagnant(s) : **${nbGagnant}**\n` +
        `👤 Organisé par <@${ctx.user.id}>`
      )
      .setColor(0xf1c40f)
      .setTimestamp(Date.now() + ms)
      .setFooter({ text: `Se termine le` });

    const msg = await salon.send({ embeds: [embed] });
    await msg.react('🎉');

    await ctx.editReply(`✅ Giveaway lancé dans <#${salon.id}> !`);

    // Timer de fin
    setTimeout(async () => {
      const msgFetch = await salon.messages.fetch(msg.id).catch(() => null);
      if (!msgFetch) return;

      const reactions = msgFetch.reactions.cache.get('🎉');
      if (!reactions) return;

      const users = await reactions.users.fetch();
      const participants = users.filter(u => !u.bot);

      if (participants.size === 0) {
        const embedFin = EmbedBuilder.from(msgFetch.embeds[0])
          .setTitle(`🎉 GIVEAWAY TERMINÉ — ${lot}`)
          .setDescription('❌ Personne n\'a participé. Pas de gagnant.')
          .setColor(0x95a5a6);

        await msgFetch.edit({ embeds: [embedFin] });
        return;
      }

      // Sélectionner les gagnants
      const liste     = [...participants.values()];
      const gagnants  = [];
      const pool      = [...liste];

      for (let i = 0; i < Math.min(nbGagnant, pool.length); i++) {
        const idx = Math.floor(Math.random() * pool.length);
        gagnants.push(pool.splice(idx, 1)[0]);
      }

      const mentions = gagnants.map(u => `<@${u.id}>`).join(', ');

      const embedFin = EmbedBuilder.from(msgFetch.embeds[0])
        .setTitle(`🎉 GIVEAWAY TERMINÉ — ${lot}`)
        .setDescription(`🏆 Gagnant(s) : ${mentions}\n👤 Organisé par <@${ctx.user.id}>`)
        .setColor(0x2ecc71);

      await msgFetch.edit({ embeds: [embedFin] });
      await salon.send(`🎉 Félicitations ${mentions} ! Vous gagnez **${lot}** !`);
    }, ms);
  },
};