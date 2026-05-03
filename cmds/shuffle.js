const { SlashCommandBuilder } = require('discord.js');
const musicQueue = require('../systems/musicQueue');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('Mélange la file d\'attente'),

  name: 'shuffle',

  async execute(ctx) {
    await ctx.defer();

    const queue = musicQueue.get(ctx.guild.id);
    if (!queue || queue.tracks.length < 2) {
      return ctx.editReply('❌ Pas assez de tracks dans la file pour mélanger.');
    }

    musicQueue.shuffle(ctx.guild.id);
    await ctx.editReply(`🔀 **${queue.tracks.length}** tracks mélangés !`);
  },
};