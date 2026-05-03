const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const UNITES = { s: 1000, m: 60000, h: 3600000, j: 86400000 };
const MAX_TIMEOUT = 28 * 24 * 60 * 60 * 1000; // 28 jours max Discord

function parseDuree(str) {
  const match = str?.match(/^(\d+)(s|m|h|j)$/);
  if (!match) return null;
  const ms = parseInt(match[1]) * UNITES[match[2]];
  return ms > MAX_TIMEOUT ? null : ms;
}

function formatDuree(ms) {
  if (ms < 60000)        return `${ms / 1000}s`;
  if (ms < 3600000)      return `${ms / 60000}m`;
  if (ms < 86400000)     return `${ms / 3600000}h`;
  return `${ms / 86400000}j`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roulette')
    .setDescription('Roulette russe — risque de timeout')
    .addUserOption(o =>
      o.setName('cible').setDescription('Membre sur qui tirer').setRequired(true)
    )
    .addStringOption(o =>
      o.setName('duree')
       .setDescription('Durée du timeout si perdu (ex: 30s, 5m, 1h, 1j) — défaut : 60s')
    )
    .addIntegerOption(o =>
      o.setName('chance')
       .setDescription('1 chance sur X de perdre — défaut : 6')
       .setMinValue(2)
       .setMaxValue(100)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  name: 'roulette',

  async execute(ctx) {
    await ctx.defer();

    if (!ctx.source.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return ctx.editReply('❌ Tu n\'as pas les permissions nécessaires.');
    }

    const cible  = ctx.isSlash ? ctx.source.options.getMember('cible')      : ctx.source.mentions.members.first();
    const chance = ctx.isSlash ? (ctx.source.options.getInteger('chance') ?? 6) : parseInt(ctx.args[1]) || 6;

    // Récupérer et parser la durée
    const dureeStr = ctx.isSlash ? ctx.source.options.getString('duree') : ctx.args[2];
    const dureeMs  = dureeStr ? parseDuree(dureeStr) : 60_000; // défaut 60s

    if (!cible)          return ctx.editReply('❌ Membre introuvable.');
    if (cible.user.bot)  return ctx.editReply('❌ Impossible de viser un bot.');
    if (!cible.moderatable) return ctx.editReply('❌ Je ne peux pas timeout ce membre.');

    if (dureeStr && !dureeMs) {
      return ctx.editReply(
        '❌ Durée invalide. Exemples : `30s`, `5m`, `2h`, `1j`\n' +
        '⚠️ Maximum : 28 jours.'
      );
    }

    // Barillet visuel
    const balles   = Array(Math.min(chance, 20)).fill('⬛'); // max 20 cases affichées
    const position = Math.floor(Math.random() * balles.length);
    balles[position] = '🔴';
    const barillet = balles.join('');
    const extraBalles = chance > 20 ? ` *(+${chance - 20} cases cachées)*` : '';

    const perd = Math.floor(Math.random() * chance) === 0;

    if (!perd) {
      return ctx.editReply(
        `🔫 ${barillet}${extraBalles}\n\n` +
        `*clic* — **${cible.user.username}** survit ! (1/${chance})`
      );
    }

    await cible.timeout(dureeMs, `Roulette russe par ${ctx.user.tag}`).catch(() => {});

    return ctx.editReply(
      `🔫 ${barillet}${extraBalles}\n\n` +
      `💥 **BANG** — **${cible.user.username}** prend **${formatDuree(dureeMs)}** de timeout ! (1/${chance})`
    );
  },
};