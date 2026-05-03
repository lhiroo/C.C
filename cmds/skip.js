const { SlashCommandBuilder } = require('discord.js');
const musicQueue = require('../systems/musicQueue');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Passe à la musique suivante'),

  name: 'skip',
  aliases: ['s', 'next'],

  async execute(ctx) {
    await ctx.defer();

    const queue = musicQueue.get(ctx.guild.id);
    if (!queue?.current) return ctx.editReply('❌ Aucune musique en cours.');

    const titre = queue.current.title;
    musicQueue.skip(ctx.guild.id);

    await ctx.editReply(`⏭️ **${titre}** skippée.`);
  },
};