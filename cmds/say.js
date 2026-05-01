const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  // Slash command
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Fait dire un message au bot')
    .addStringOption(o =>
      o.setName('text')
        .setDescription('Texte à envoyer')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // Prefix command
  name: 'say',
  usage: 'cc say [text]',

  async execute(ctx) {
    let text;

    // Récupération du texte selon le type de commande
    if (ctx.isSlash) {
      text = ctx.source.options.getString('text');
      await ctx.source.reply({ content: text });
    } else {
      text = ctx.args.slice(1).join(' ');

      // suppression de la commande utilisateur
      await ctx.source.delete().catch(() => {});

      await ctx.send({ content: text });
    }
  },
};