const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Affiche l\'avatar d\'un utilisateur')
    .addUserOption(o => o.setName('cible').setDescription('Utilisateur (toi par défaut)')),

  name: 'pp',
  aliases: ['avatar'],
  usage: 'cc pp [@utilisateur]',

  async execute(ctx) {
    const cible = ctx.isSlash
      ? (ctx.source.options.getUser('cible') ?? ctx.source.user)
      : (ctx.source.mentions.users.first() ?? ctx.source.author);

    const url = cible.displayAvatarURL({ size: 1024, extension: 'png' });

    const embed = new EmbedBuilder()
      .setTitle(`Avatar de ${cible.username}`)
      .setImage(url)
      .setColor(0x5865f2)
      .setURL(url);

    await ctx.reply({ embeds: [embed] });
  },
};