const { SlashCommandBuilder } = require('discord.js');

const UNITES = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  j: 24 * 60 * 60 * 1000,
};

function parseDuree(str) {
  const match = str.match(/^(\d+)(s|m|h|j)$/);
  if (!match) return null;
  return parseInt(match[1]) * UNITES[match[2]];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Définit un rappel')
    .addStringOption(o => o.setName('duree').setDescription('Ex : 10m, 2h, 1j').setRequired(true))
    .addStringOption(o => o.setName('message').setDescription('Ce dont tu veux te souvenir').setRequired(true)),

  name: 'remind',
  aliases: ['rappel', 'remindme'],
  usage: '!remind 10m Acheter du lait',

  async execute(ctx) {
    // ← defer en TOUT PREMIER, avant toute validation
    await ctx.defer();

    const dureeStr = ctx.isSlash ? ctx.source.options.getString('duree')   : ctx.args[0];
    const texte    = ctx.isSlash ? ctx.source.options.getString('message') : ctx.args.slice(1).join(' ');

    if (!texte)    return ctx.editReply('❌ Indique un message de rappel.');

    const ms = parseDuree(dureeStr);
    if (!ms)       return ctx.editReply('❌ Format invalide. Exemples : `10s`, `5m`, `2h`, `1j`');
    if (ms > 7 * 24 * 60 * 60 * 1000) return ctx.editReply('❌ Maximum 7 jours.');

    const timestamp = Math.floor((Date.now() + ms) / 1000);
    const userId    = ctx.user.id;
    const channelId = ctx.channel.id;
    const client    = ctx.source.client;
    const userObj   = ctx.user;

    // editReply car on a déjà defer()
    await ctx.editReply(`⏰ Rappel enregistré ! Je te ping <t:${timestamp}:R> pour : **${texte}**`);

    setTimeout(async () => {
      const msgRappel = `⏰ <@${userId}> Rappel : **${texte}**`;

      const channel = client.channels.cache.get(channelId);
      if (channel) await channel.send(msgRappel).catch(() => {});

      try {
        const dmChannel = await userObj.createDM();
        await dmChannel.send(`⏰ **Rappel** depuis <#${channelId}> !\n\n📝 ${texte}`);
      } catch {
        console.warn(`[Remind] DM impossible pour ${userObj.tag}`);
      }
    }, ms);
  },
};