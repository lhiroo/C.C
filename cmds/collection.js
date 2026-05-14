const {
  SlashCommandBuilder, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
} = require('discord.js');
const { getCollection } = require('../systems/collection/inventory');
const { RARITIES }      = require('../systems/gacha/drops');

// Construire l'embed + les boutons pour une page donnée
async function buildPage(cible, guildId, page, rarity) {
  const { cards, total, totalPages } = await getCollection(cible.id, guildId, page, rarity);

  const embed = new EmbedBuilder()
    .setTitle(`📦 Collection de ${cible.username}`)
    .setColor(0x5865f2)
    .setThumbnail(cible.displayAvatarURL())
    .setFooter({ text: `${total} carte(s) • Page ${page}/${totalPages}` });

  if (cards.length === 0) {
    embed.setDescription('*Aucune carte sur cette page.*');
  } else {
    const lignes = cards.map(c => {
      const r   = RARITIES[c.rarity];
      const fav = c.is_favorite ? '⭐ ' : '';
      return `${fav}${r.emoji} **${c.name}** — *${c.anime}* \`⚔️${c.power}\` \`#${c.card_id}\``;
    }).join('\n');
    embed.setDescription(lignes);
  }

  // Boutons de pagination
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('col_first')
      .setLabel('⏮')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 1),
    new ButtonBuilder()
      .setCustomId('col_prev')
      .setLabel('◀')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page <= 1),
    new ButtonBuilder()
      .setCustomId('col_page')
      .setLabel(`${page} / ${totalPages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true), // indicateur non cliquable
    new ButtonBuilder()
      .setCustomId('col_next')
      .setLabel('▶')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page >= totalPages),
    new ButtonBuilder()
      .setCustomId('col_last')
      .setLabel('⏭')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages),
  );

  return { embed, row, totalPages };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('collection')
    .setDescription('Voir ta collection de personnages')
    .addUserOption(o => o.setName('joueur').setDescription('Voir la collection d\'un autre joueur'))
    .addIntegerOption(o => o.setName('page').setDescription('Page').setMinValue(1))
    .addStringOption(o =>
      o.setName('rarity').setDescription('Filtrer par rareté')
       .addChoices(
         ...Object.entries(RARITIES).map(([k, v]) => ({ name: `${v.emoji} ${v.label}`, value: k }))
       )
    ),

  name: 'collection',
  aliases: ['col', 'cartes'],

  async execute(ctx) {
    await ctx.defer();

    const cible  = ctx.isSlash
      ? (ctx.source.options.getUser('joueur') ?? ctx.user)
      : (ctx.source.mentions.users.first() ?? ctx.user);

    const rarity = ctx.isSlash ? ctx.source.options.getString('rarity') : null;

    let page = ctx.isSlash
      ? (ctx.source.options.getInteger('page') ?? 1)
      : (parseInt(ctx.args.find(a => !a.startsWith('<@'))) || 1);

    const { embed, row, totalPages } = await buildPage(cible, ctx.guild.id, page, rarity);

    if (totalPages === 0) {
      return ctx.editReply(`📭 ${cible.id === ctx.user.id ? 'Tu n\'as' : `**${cible.username}** n'a`} aucune carte${rarity ? ` de rareté **${RARITIES[rarity].label}**` : ''}.`);
    }

    // Envoyer le message initial
    const msg = await ctx.editReply({
      embeds:     [embed],
      components: totalPages > 1 ? [row] : [], // masquer les boutons si une seule page
    });

    if (totalPages <= 1) return;

    // Écouter les clics pendant 3 minutes
    const collector = msg.createMessageComponentCollector({
      time: 3 * 60 * 1000,
      filter: i => i.user.id === ctx.user.id, // seul l'auteur peut naviguer
    });

    collector.on('collect', async interaction => {
      switch (interaction.customId) {
        case 'col_first': page = 1;             break;
        case 'col_prev':  page = Math.max(1, page - 1);          break;
        case 'col_next':  page = Math.min(totalPages, page + 1); break;
        case 'col_last':  page = totalPages;    break;
      }

      const { embed: newEmbed, row: newRow } = await buildPage(cible, ctx.guild.id, page, rarity);

      await interaction.update({
        embeds:     [newEmbed],
        components: [newRow],
      });
    });

    // Désactiver les boutons à l'expiration
    collector.on('end', async () => {
      const { embed: finalEmbed, row: finalRow } = await buildPage(cible, ctx.guild.id, page, rarity);

      const disabledRow = new ActionRowBuilder().addComponents(
        finalRow.components.map(btn =>
          ButtonBuilder.from(btn).setDisabled(true)
        )
      );

      await msg.edit({ embeds: [finalEmbed], components: [disabledRow] }).catch(() => {});
    });
  },
};