const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  // Pour le slash
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Affiche la latence du bot'),

  // Pour le prefix
  name: 'ping',
  aliases: ['p'],         // !p marche aussi
  usage: 'cc ping',

  // Exécution commune
  async execute(ctx) {
    const latency = Date.now() - ctx.source.createdTimestamp;
    await ctx.reply(`🏓 Pong ! Latence : **${latency}ms**`);
  },
};