const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Supprime des messages en masse')
    .addIntegerOption(o =>
      o.setName('nombre').setDescription('Nombre de messages (1-100)').setRequired(true).setMinValue(1).setMaxValue(100)
    )
    .addUserOption(o => o.setName('filtre').setDescription('Supprimer uniquement les messages de cet utilisateur'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  name: 'clear',
  aliases: ['purge'],
  usage: 'cc clear 10 [@utilisateur]',

  async execute(ctx) {
    const nombre = ctx.isSlash ? ctx.source.options.getInteger('nombre')+1 : parseInt(ctx.args[0])+1;
    const filtre = ctx.isSlash ? ctx.source.options.getUser('filtre')    : ctx.source.mentions.users.first();

    if (!nombre || nombre < 1 || nombre > 100) {
      return ctx.reply('❌ Indique un nombre entre 1 et 100.');
    }

    // Fetch les messages
    let messages = await ctx.channel.messages.fetch({ limit: nombre });

    // Filtrer par auteur si demandé
    if (filtre) {
      messages = messages.filter(m => m.author.id === filtre.id);
    }

    // Discord ne peut pas supprimer les messages de plus de 14 jours en masse
    const recents = messages.filter(m => Date.now() - m.createdTimestamp < 14 * 24 * 60 * 60 * 1000);

    const deleted = await ctx.channel.bulkDelete(recents, true);

    const confirmation = await ctx.reply(`🗑️ **${deleted.size}** message(s) supprimé(s).`);

    // Auto-supprimer le message de confirmation après 4s
    setTimeout(() => confirmation.delete().catch(() => {}), 4000);
  },
};