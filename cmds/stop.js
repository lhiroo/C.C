const { SlashCommandBuilder } = require('discord.js');
const musicQueue = require('../systems/musicQueue');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Arrête la musique et vide la file'),

  name: 'stop',

  async execute(ctx) {
    await ctx.defer();

    if (!musicQueue.has(ctx.guild.id)) return ctx.editReply('❌ Aucune musique en cours.');

    musicQueue.destroy(ctx.guild.id);
    await ctx.editReply('⏹️ Musique arrêtée, file vidée, bot déconnecté.');
  },
};