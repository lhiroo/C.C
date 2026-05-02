const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

// Stockage en mémoire (repart à zéro au redémarrage)
// Pour persister, remplace par une vraie BDD (SQLite, MongoDB, Supabase...)
const warnings = new Map(); // Map<guildId, Map<userId, string[]>>

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Avertit un membre')
    .addUserOption(o => o.setName('cible').setDescription('Membre').setRequired(true))
    .addStringOption(o => o.setName('raison').setDescription('Raison').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  name: 'warn',
  usage: 'cc warn @utilisateur [raison]',

  async execute(ctx) {

    if (!ctx.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      const confirmation = await ctx.reply(
        "❌ Tu n'as pas les permissions nécessaires."
      );

      setTimeout(() => {
        confirmation.delete().catch(() => {});
      }, 4000);

      return;
    }

    const cible  = ctx.isSlash ? ctx.source.options.getUser('cible')    : ctx.source.mentions.users.first();
    const raison = ctx.isSlash ? ctx.source.options.getString('raison') : ctx.args.slice(1).join(' ') || 'Aucune raison';

    if (!cible) return ctx.reply('❌ Mentionne un utilisateur.');

    // Init les Maps si besoin
    if (!warnings.has(ctx.guild.id)) warnings.set(ctx.guild.id, new Map());
    const guildWarns = warnings.get(ctx.guild.id);
    if (!guildWarns.has(cible.id)) guildWarns.set(cible.id, []);

    guildWarns.get(cible.id).push(raison);
    const total = guildWarns.get(cible.id).length;

    // Prévenir l'utilisateur en DM
    cible.send(`⚠️ Tu as reçu un avertissement sur **${ctx.guild.name}**.\n📝 Raison : ${raison}`).catch(() => {});

    await ctx.reply(`⚠️ **${cible.tag}** a été averti. (${total} warn${total > 1 ? 's' : ''} au total)`);
  },
};

module.exports.warnings = warnings;