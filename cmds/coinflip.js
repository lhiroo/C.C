const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Lance une pièce'),

  name: 'coinflip',
  aliases: ['pile', 'face'],

  async execute(ctx) {
    const result = Math.random() < 0.5 ? '🪙 Pile !' : '🪙 Face !';
    await ctx.reply(result);
  },
};