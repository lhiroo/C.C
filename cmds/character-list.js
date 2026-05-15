const {
  SlashCommandBuilder, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
} = require('discord.js');
const { getAllCharacters } = require('../systems/gacha/roller');
const { RARITIES }         = require('../systems/gacha/drops');

const PAGE_SIZE = 10;

// ── Pagination en mémoire ──────────────────────────────────────
function getPage(page) {
  const all        = getAllCharacters().sort((a, b) => b.power - a.power);
  const totalPages = Math.ceil(all.length / PAGE_SIZE) || 1;
  page             = Math.max(1, Math.min(page, totalPages));
  const characters = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return { characters, totalPages, total: all.length, page };
}

// ── Embed ──────────────────────────────────────────────────────
function buildEmbed(page, totalPages, characters, total) {
  const lines = characters.map((c, i) => {
    const r   = RARITIES[c.rarity?.toLowerCase()];
    const num = (page - 1) * PAGE_SIZE + i + 1;
    return `\`${String(num).padStart(3, '0')}\` ${r?.emoji ?? '❓'} **${c.name}** — *${c.anime}* \`⚔️${c.power}\``;
  });

  return new EmbedBuilder()
    .setTitle('📚 Liste des personnages')
    .setDescription(lines.join('\n') || '*Aucun personnage.*')
    .setColor(0x5865f2)
    .setFooter({ text: `Page ${page}/${totalPages} • ${total} personnages au total` })
    .setTimestamp();
}

// ── Boutons ────────────────────────────────────────────────────
function buildButtons(page, totalPages) {
  const atFirst = page <= 1;
  const atLast  = page >= totalPages;

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`chars_first_${page}`)
      .setLabel('⏮')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(atFirst),
    new ButtonBuilder()
      .setCustomId(`chars_prev_${page}`)
      .setLabel('◀')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(atFirst),
    new ButtonBuilder()
      .setCustomId(`chars_page_${page}`)
      .setLabel(`${page} / ${totalPages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`chars_next_${page}`)
      .setLabel('▶')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(atLast),
    new ButtonBuilder()
      .setCustomId(`chars_last_${page}`)
      .setLabel('⏭')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(atLast),
  );
}

// ── Envoi / mise à jour ────────────────────────────────────────
async function sendPage(target, page, isUpdate = false) {
  const { characters, totalPages, total, page: safePage } = getPage(page);
  const embed = buildEmbed(safePage, totalPages, characters, total);
  const row   = buildButtons(safePage, totalPages);

  const payload = {
    embeds:     [embed],
    components: totalPages > 1 ? [row] : [],
  };

  return isUpdate
    ? target.update(payload)
    : target.editReply(payload);
}

// ── Commande ───────────────────────────────────────────────────
module.exports = {
  data: new SlashCommandBuilder()
    .setName('character-list')
    .setDescription('Affiche la liste complète des personnages'),

  name: 'character-list',
  aliases: ['chars', 'persos', 'list', 'characters', 'characterlist'],

  async execute(ctx) {
    await ctx.defer();
    const msg = await sendPage(ctx, 1);

    const { totalPages } = getPage(1);
    if (totalPages <= 1) return;

    // Collector — 5 minutes, auteur uniquement
    const collector = msg.createMessageComponentCollector({
      time:   5 * 60 * 1000,
      filter: i => i.user.id === ctx.user.id,
    });

    let currentPage = 1;

    collector.on('collect', async interaction => {
      const [, action] = interaction.customId.split('_');
      const { totalPages } = getPage(currentPage);

      switch (action) {
        case 'first': currentPage = 1;                                    break;
        case 'prev':  currentPage = Math.max(1, currentPage - 1);        break;
        case 'next':  currentPage = Math.min(totalPages, currentPage + 1);break;
        case 'last':  currentPage = totalPages;                           break;
        default: return;
      }

      await sendPage(interaction, currentPage, true);
    });

    // Désactiver les boutons à l'expiration
    collector.on('end', async () => {
      const { characters, totalPages, total } = getPage(currentPage);
      const embed = buildEmbed(currentPage, totalPages, characters, total);

      const disabledRow = new ActionRowBuilder().addComponents(
        buildButtons(currentPage, totalPages).components.map(btn =>
          ButtonBuilder.from(btn).setDisabled(true)
        )
      );

      await msg.edit({ embeds: [embed], components: [disabledRow] }).catch(() => {});
    });
  },

  // Gardé pour compatibilité si tu gères les boutons depuis index.js
  async handleButton(interaction) {
    if (!interaction.customId.startsWith('chars_')) return false;
    const [, action, currentPage] = interaction.customId.split('_');
    let newPage = parseInt(currentPage);

    const { totalPages } = getPage(newPage);
    switch (action) {
      case 'first': newPage = 1;                             break;
      case 'prev':  newPage = Math.max(1, newPage - 1);     break;
      case 'next':  newPage = Math.min(totalPages, newPage + 1); break;
      case 'last':  newPage = totalPages;                    break;
    }

    await sendPage(interaction, newPage, true);
    return true;
  },
};