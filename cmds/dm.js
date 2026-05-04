const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dm')
    .setDescription('Envoie un DM à un membre ou à tout le serveur')
    .addStringOption(o =>
      o.setName('contenu').setDescription('Contenu du DM').setRequired(true)
    )
    .addUserOption(o =>
      o.setName('cible').setDescription('Membre ciblé (tous les membres si absent)')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  name: 'dm',
  usage: 'cc dm <contenu> [@utilisateur]',

  async execute(ctx) {
    await ctx.defer(true);

    if (!ctx.source.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return ctx.editReply('❌ Tu n\'as pas les permissions nécessaires.');
    }

    const cible   = ctx.isSlash ? ctx.source.options.getUser('cible')     : ctx.source.mentions.users.first();
    const contenu = ctx.isSlash ? ctx.source.options.getString('contenu') : ctx.args.filter(a => !a.startsWith('<@')).join(' ');
    const auteur  = ctx.user;

    if (!contenu) return ctx.editReply('❌ Le contenu du DM est vide.');

    // Helper : DM à l'auteur puis supprimer toute trace dans le chat
    async function finir(texte) {
  try {
    const dm = await auteur.createDM();
    await dm.send(texte);

    // Supprimer la réponse slash
    await ctx.source.deleteReply().catch(() => {});

    // ← Supprimer le message "Traitement en cours..." des prefix commands
    if (!ctx.isSlash && ctx._thinkingMsg) {
      await ctx._thinkingMsg.delete().catch(() => {});
    }

    // Supprimer le message original de l'utilisateur
    if (!ctx.isSlash) await ctx.source.delete().catch(() => {});

  } catch {
      console.log('catched')

      if (!ctx.isSlash && ctx._thinkingMsg) {
        await ctx._thinkingMsg.delete().catch(() => {});
    }
      if (!ctx.isSlash) await ctx.source.delete().catch(() => {});
      
  }
}

    // ── DM à tout le serveur ──────────────────────────────────────
    if (!cible) {
      await ctx.guild.members.fetch();
      const membres = ctx.guild.members.cache.filter(m => !m.user.bot && m.id !== auteur.id);

      let success = 0;
      let failed  = 0;

      for (const member of membres.values()) {
        try {
          await member.send(contenu);
          success++;
        } catch {
          failed++;
          console.log(`[DM] Impossible d'envoyer à ${member.user.tag}`);
        }
      }

      return finir(
        `📨 **DM serveur envoyé** sur **${ctx.guild.name}**\n\n` +
        `✅ Succès : **${success}** membre(s)\n` +
        (failed > 0 ? `❌ Échec : **${failed}** membre(s) (DMs fermés)` : '')
      );
    }

    // ── DM à un membre précis ─────────────────────────────────────
    const member = ctx.guild.members.cache.get(cible.id);
    if (!member) return ctx.editReply('❌ Membre introuvable sur ce serveur.');

    try {
      await member.send(contenu);
      return finir(
        `📨 **DM envoyé** sur **${ctx.guild.name}**\n\n` +
        `👤 Destinataire : **${member.user.tag}**\n` +
        `💬 Message : ${contenu.slice(0, 200)}${contenu.length > 200 ? '...' : ''}`
      );
    } catch {
      return ctx.editReply(`❌ Impossible d'envoyer un DM à **${member.user.tag}** (DMs fermés).`);
    }
  },
};