const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const UNITES = { s: 1000, m: 60000, h: 3600000, j: 86400000 };

function parseDuree(str) {
  if (!str) return null;
  const match = str.match(/^(\d+)(s|m|h|j)$/);
  if (!match) return null;
  return parseInt(match[1]) * UNITES[match[2]];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Met un membre en sourdine temporaire')
    .addUserOption(o =>
      o.setName('cible')
        .setDescription('Membre')
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName('duree')
        .setDescription('Ex: 10m, 2h, 3j')
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName('raison')
        .setDescription('Raison')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  name: 'mute',
  usage: 'mute @user 10m [raison]',

  async execute(ctx) {
    const memberPerms = ctx.source?.member?.permissions;

    if (!memberPerms?.has(PermissionFlagsBits.ModerateMembers)) {
      const msg = await ctx.reply("❌ Permissions insuffisantes.");
      setTimeout(() => msg.delete().catch(() => {}), 4000);
      return;
    }

    const cible = ctx.isSlash
      ? ctx.source.options.getUser('cible')
      : ctx.source.mentions.users.first();

    const dureeStr = ctx.isSlash
      ? ctx.source.options.getString('duree')
      : ctx.args?.[1];

    const raison = ctx.isSlash
      ? ctx.source.options.getString('raison') || 'Aucune raison'
      : ctx.args.slice(2).join(' ') || 'Aucune raison';

    if (!cible) return ctx.reply("❌ Utilisateur introuvable.");

    const ms = parseDuree(dureeStr);
    if (!ms) {
      return ctx.reply("❌ Durée invalide. Format attendu : 10m, 2h, 3j, 30s");
    }

    const member = await ctx.guild.members.fetch(cible.id).catch(() => null);
    if (!member) return ctx.reply("❌ Membre introuvable.");

    const maxTimeout = 28 * 24 * 60 * 60 * 1000;
    if (ms > maxTimeout) {
      return ctx.reply("❌ La durée dépasse la limite (28 jours).");
    }

    await member.timeout(ms, raison);

    const dureeAffichee = dureeStr;

    return ctx.reply(
      `🔇 ${cible.tag} mute pendant **${dureeAffichee}**\n📝 Raison : ${raison}`
    );
  },
};