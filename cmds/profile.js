const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getProfile }  = require('../systems/collection/inventory');
const { RARITIES }    = require('../systems/gacha/drops');
const { ROLL_LIMIT }  = require('../systems/gacha/roller');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gprofile')
    .setDescription('Affiche ton profil gacha')
    .addUserOption(o => o.setName('joueur').setDescription('Profil d\'un autre joueur')),

  name: 'gprofile',

  async execute(ctx) {
    await ctx.defer();

    const cible   = ctx.isSlash ? (ctx.source.options.getUser('joueur') ?? ctx.user) : (ctx.source.mentions.users.first() ?? ctx.user);
    const profile = await getProfile(cible.id, ctx.guild.id);

    if (!profile) return ctx.editReply('❌ Ce joueur n\'a pas encore joué.');

    const { user, stats, best, total } = profile;

    const statsByRarity = Object.entries(RARITIES)
  .reverse()
  .map(([key, r]) => {
    const s = stats.find(s => s.rarity === key);
    if (!s || !s.count) return null;

    return `${r.emoji} ${r.label} : **${s.count}**`;
  })
  .filter(Boolean)
  .join('\n');

    const claimCD = user.last_claim
      ? Math.max(0, Math.ceil((user.last_claim * 1000 + 3 * 3600000 - Date.now()) / 1000 / 60))
      : 0;

    const embed = new EmbedBuilder()
      .setTitle(`🎴 Profil de ${cible.username}`)
      .setThumbnail(cible.displayAvatarURL())
      .setColor(0x9b59b6)
      .addFields(
        {
          name: '📊 Statistiques',
          value: [
            `📦 Cartes possédées : **${total}**`,
            `⏰ Prochain claim : ${claimCD > 0 ? `dans **${Math.floor(claimCD/60)}h${claimCD%60}m**` : '**Disponible !**'}`,
          ].join('\n'),
          inline: false,
        },
        { name: '🏆 Collection par rareté', value: statsByRarity, inline: false },
      );

    if (best) {
      embed.addFields({
        name:  '⭐ Meilleure carte',
        value: `${RARITIES[best.rarity].emoji} **${best.name}** — *${best.anime}* \`⚔️${best.power}\``,
      });
    }

    await ctx.editReply({ embeds: [embed] });
  },
};