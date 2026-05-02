const { SlashCommandBuilder } = require('discord.js');

const UNITES = {
  s:  1000,
  m:  60 * 1000,
  h:  60 * 60 * 1000,
  j:  24 * 60 * 60 * 1000,
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
  usage: 'cc remind 10m Acheter du lait',

  async execute(ctx) {
    const dureeStr = ctx.isSlash ? ctx.source.options.getString('duree')   : ctx.args[0];
    const texte    = ctx.isSlash ? ctx.source.options.getString('message') : ctx.args.slice(1).join(' ');

    const ms = parseDuree(dureeStr);
    if (!ms) return ctx.reply('❌ Format invalide. Exemples : `10s`, `5m`, `2h`, `1j`');
    if (ms > 7 * 24 * 60 * 60 * 1000) return ctx.reply('❌ Maximum 7 jours.');

    const timestamp = Math.floor((Date.now() + ms) / 1000);
    await ctx.reply(`⏰ Rappel enregistré ! Je te ping <t:${timestamp}:R> pour : **${texte}**`);

    // Stocker user id + channel
    const userId    = ctx.user.id;
    const channelId = ctx.channel.id;

    setTimeout(async () => {
      const channel = ctx.source.client.channels.cache.get(channelId);
      if (channel) {
        channel.send(`⏰ <@${userId}> Rappel : **${texte}**`);
      }
    }, ms);
  },
};