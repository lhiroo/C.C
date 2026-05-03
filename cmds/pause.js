const { SlashCommandBuilder } = require('discord.js');
const musicQueue = require('../systems/musicQueue');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Met la musique en pause'),

  name: 'pause',

  async execute(ctx) {
    await ctx.defer();

    const ok = musicQueue.pause(ctx.guild.id);
    if (!ok) return ctx.editReply('❌ Aucune musique en cours ou déjà en pause.');
    await ctx.editReply('⏸️ Musique mise en pause.');
  },
};