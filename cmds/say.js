const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Fait parler le bot')
    .addStringOption(o =>
      o.setName('message').setDescription('Message à envoyer').setRequired(true)
    )
    .addChannelOption(o =>
      o.setName('salon').setDescription('Salon cible (salon actuel par défaut)')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  name: 'say',
  usage: 'cc  say [#salon] <message>',

  async execute(ctx) {
    if (!ctx.source?.member?.permissions?.has(PermissionFlagsBits.Administrator)) {
      const confirmation = await ctx.reply(
        "❌ Tu n'as pas les permissions nécessaires."
      );

      setTimeout(() => {
        confirmation.delete().catch(() => {});
      }, 4000);

      return;
    }
    // ── Récupérer les paramètres ──────────────────────────────────
    let texte, salon;

    if (ctx.isSlash) {
      texte = ctx.source.options.getString('message');
      salon = ctx.source.options.getChannel('salon') ?? ctx.channel;
    } else {
      salon = ctx.source.mentions.channels.first() ?? ctx.channel;

      // Retirer la mention du channel du message si elle est présente
      texte = ctx.source.content
        .slice(ctx.source.content.indexOf(ctx.args[0]) - 0)  // après le prefix+commande
        .replace(/<#\d+>/g, '')  // supprimer la mention #salon
        .trim();

      // Reconstruire proprement depuis les args
      texte = ctx.args
        .filter(a => !a.startsWith('<#'))  // ignorer la mention channel
        .join(' ')
        .trim();
    }

    if (!texte) return ctx.replyEphemeral('❌ Le message est vide.');

    // ── Vérifier que le bot peut écrire dans le salon cible ──────
    const botMember = ctx.guild.members.me;
    if (!salon.permissionsFor(botMember).has(PermissionFlagsBits.SendMessages)) {
      return ctx.replyEphemeral(`❌ Je n'ai pas la permission d'écrire dans <#${salon.id}>.`);
    }

    // ── Envoyer le message ────────────────────────────────────────
    await salon.send(texte);

    // ── Supprimer la commande de l'utilisateur ───────────────────
    if (ctx.isSlash) {
      // Slash : répondre en éphémère pour accuser réception puis c'est tout
      await ctx.replyEphemeral(`✅ Message envoyé dans <#${salon.id}>.`);
    } else {
      // Prefix : supprimer le message original
      await ctx.source.delete().catch(() => {
        // Silencieux si le bot n'a pas la permission ManageMessages
      });
    }
  },
};