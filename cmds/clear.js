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

    if (!ctx.source?.member?.permissions?.has(PermissionFlagsBits.ManageMessages)) {
      const confirmation = await ctx.reply(
        "❌ Tu n'as pas les permissions nécessaires."
      );

      setTimeout(() => {
        confirmation.delete().catch(() => {});
      }, 4000);

      return;
    }

    // Récupération du nombre
    const nombre = ctx.isSlash
      ? ctx.source.options.getInteger('nombre')
      : parseInt(ctx.args[0]);

    // Récupération du filtre utilisateur
    const filtre = ctx.isSlash
      ? ctx.source.options.getUser('filtre')
      : ctx.source.mentions.users.first();

    // Vérification du nombre
    if (isNaN(nombre) || nombre < 1 || nombre > 100) {
      return ctx.reply('❌ Indique un nombre entre 1 et 100.');
    }

    // Fetch messages
    let messages = await ctx.channel.messages.fetch({
      limit: nombre + 1 // +1 pour inclure la commande
    });

    // Filtre utilisateur
    if (filtre) {
      messages = messages.filter(
        m => m.author.id === filtre.id
      );
    }

    // Messages récents uniquement (<14 jours)
    const recents = messages.filter(
      m => Date.now() - m.createdTimestamp < 14 * 24 * 60 * 60 * 1000
    );

    // Vérification si vide
    if (recents.size === 0) {
      return ctx.reply(
        "❌ Aucun message récent à supprimer."
      );
    }

    // Suppression
    const deleted = await ctx.channel.bulkDelete(
      recents,
      true
    );

    // Confirmation
    const confirmation = await ctx.reply(
      `🗑️ **${deleted.size}** message(s) supprimé(s).`
    );

    setTimeout(() => {
      confirmation.delete().catch(() => {});
    }, 4000);
  }
}