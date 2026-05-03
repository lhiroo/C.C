const { SlashCommandBuilder } = require('discord.js');
const musicQueue = require('../systems/musicQueue');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Change le volume')
    .addIntegerOption(o =>
      o.setName('niveau').setDescription('Volume de 0 à 100').setRequired(true).setMinValue(0).setMaxValue(100)
    ),

  name: 'volume',
  aliases: ['vol'],

  async execute(ctx) {
    await ctx.defer();

    const vol = ctx.isSlash ? ctx.source.options.getInteger('niveau') : parseInt(ctx.args[0]);
    if (isNaN(vol) || vol < 0 || vol > 100) return ctx.editReply('❌ Volume entre 0 et 100.');

    const ok = musicQueue.setVolume(ctx.guild.id, vol);
    if (!ok) return ctx.editReply('❌ Aucune musique en cours.');

    const emoji = vol === 0 ? '🔇' : vol < 40 ? '🔈' : vol < 75 ? '🔉' : '🔊';
    await ctx.editReply(`${emoji} Volume réglé à **${vol}%**.`);
  },
};