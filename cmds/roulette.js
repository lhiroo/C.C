const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roulette')
    .setDescription('Roulette russe — 1 chance sur 6 de prendre un timeout de 60s'),
    
  name: 'roulette',

  async execute(ctx) {
    await ctx.defer();

    const membre = ctx.isSlash ? ctx.source.member : ctx.source.member;
    const survie = Math.floor(Math.random() * 6) !== 0; // 1/6 de mourir

    const balles = ['⬛','⬛','⬛','⬛','⬛','⬛'];
    const position = Math.floor(Math.random() * 6);
    balles[position] = '🔴';

    const barillet = balles.join('');

    if (survie) {
      await ctx.editReply(`🔫 ${barillet}\n\n*clic* — **${ctx.user.username}** est en vie ! 😅`);
    } else {
      await ctx.editReply(`🔫 ${barillet}\n\n💥 **BANG** — **${ctx.user.username}** prend 60 secondes de timeout !`);
      await membre.timeout(60 * 1000, 'Roulette russe').catch(() => {});
    }
  },
};