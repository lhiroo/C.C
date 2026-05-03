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

    // Vérification permission (redondant avec setDefaultMemberPermissions mais sécurisé)
    if (!ctx.source.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return ctx.editReply('❌ Tu n\'as pas les permissions nécessaires.');
    }

    const cible   = ctx.isSlash ? ctx.source.options.getUser('cible')     : ctx.source.mentions.users.first();
    const contenu = ctx.isSlash ? ctx.source.options.getString('contenu') : ctx.args.filter(a => !a.startsWith('<@')).join(' ');

    if (!contenu) return ctx.editReply('❌ Le contenu du DM est vide.');

    // ── DM à tout le serveur ──────────────────────────────────────
    if (!cible) {
      await ctx.editReply('📨 Envoi en cours à tous les membres...');

      await ctx.guild.members.fetch();
      const membres = ctx.guild.members.cache.filter(m => !m.user.bot);

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

      return ctx.editReply(
        `✅ DM envoyé à **${success}** membre(s).\n` +
        (failed > 0 ? `❌ Échec pour **${failed}** membre(s) (DMs fermés).` : '')
      );
    }

    // ── DM à un membre précis ─────────────────────────────────────
    const member = ctx.guild.members.cache.get(cible.id);
    if (!member) return ctx.editReply('❌ Membre introuvable sur ce serveur.');

    try {
      await member.send(contenu);

      if (!ctx.isSlash) {
        await ctx.source.delete().catch(() => {});
      }

      return ctx.editReply(`✅ DM envoyé à **${member.user.tag}**.`);
    } catch {
      return ctx.editReply(`❌ Impossible d'envoyer un DM à **${member.user.tag}** (DMs fermés).`);
    }
  },
};