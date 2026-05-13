const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getAllCharacters } = require('../systems/gacha/roller');
const { RARITIES }         = require('../systems/gacha/drops');

const PAGE_SIZE = 10;

function buildEmbed(page, totalPages, characters, total) {
  const lines = characters.map(c => {
    const rarity = RARITIES[c.rarity.toLowerCase()];
    return `${rarity?.emoji || '❓'} **${c.name}** — *${c.anime}* \`⚔️${c.power}\``;
  });

  return new EmbedBuilder()
    .setTitle('📚 Liste des personnages')
    .setDescription(lines.join('\n') || 'Aucun personnage.')
    .setColor(0x5865f2)
    .setFooter({ text: `Page ${page}/${totalPages} • ${total} personnages` })
    .setTimestamp();
}

function buildButtons(page, totalPages) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`characters_prev_${page}`)
      .setLabel('⬅️').setStyle(ButtonStyle.Secondary).setDisabled(page <= 1),
    new ButtonBuilder()
      .setCustomId(`characters_next_${page}`)
      .setLabel('➡️').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages),
  );
}

function getPage(page) {
  // Tri + pagination 100% en mémoire
  const all        = getAllCharacters().sort((a, b) => b.power - a.power);
  const totalPages = Math.ceil(all.length / PAGE_SIZE);

  page = Math.max(1, Math.min(page, totalPages));

  const characters = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return { characters, totalPages, total: all.length, page };
}

async function sendPage(ctx, page, edit = false) {
  const { characters, totalPages, total } = getPage(page); // ← 0 requête DB
  const embed = buildEmbed(page, totalPages, characters, total);
  const row   = buildButtons(page, totalPages);

  if (edit) return ctx.update({ embeds: [embed], components: [row] });
  return ctx.editReply({ embeds: [embed], components: [row] });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('character-list')
    .setDescription('Affiche la liste des personnages'),
  name: 'characterlist',
  aliases: ['chars', 'persos', 'list', 'characters'],

  async execute(ctx) {
    await ctx.defer();
    await sendPage(ctx, 1);
  },

  async handleButton(interaction) {
    if (!interaction.customId.startsWith('characters_')) return;
    const [, action, currentPage] = interaction.customId.split('_');
    const newPage = parseInt(currentPage) + (action === 'next' ? 1 : -1);
    await sendPage(interaction, newPage, true);
  }
};