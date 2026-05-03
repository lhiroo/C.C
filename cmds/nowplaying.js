const { SlashCommandBuilder } = require('discord.js');
const musicQueue = require('../systems/musicQueue');
const { buildNowPlayingEmbed } = require('../systems/musicQueue');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Affiche la musique en cours'),

  name: 'nowplaying',
  aliases: ['np', 'current'],

  async execute(ctx) {
    await ctx.defer();

    const queue = musicQueue.get(ctx.guild.id);
    if (!queue?.current) return ctx.editReply('❌ Aucune musique en cours.');

    await ctx.editReply({ embeds: [buildNowPlayingEmbed(queue.current, queue)] });
  },
};