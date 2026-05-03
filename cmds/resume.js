const { SlashCommandBuilder } = require('discord.js');
const musicQueue = require('../systems/musicQueue');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Reprend la musique'),

  name: 'resume',
  aliases: ['unpause'],

  async execute(ctx) {
    await ctx.defer();

    const ok = musicQueue.resume(ctx.guild.id);
    if (!ok) return ctx.editReply('❌ Aucune musique en pause.');
    await ctx.editReply('▶️ Lecture reprise.');
  },
};