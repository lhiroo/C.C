const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const db = require('../db/database');
const { RARITIES } = require('../systems/gacha/drops');

const PAGE_SIZE = 10;

function buildEmbed(page, totalPages, totalCharacters, characters) {
  const lines = characters.map(character => {
    const rarity = RARITIES[character.rarity.toLowerCase()];

    return `${rarity?.emoji || '❓'} **${character.name}** — *${character.anime}* \`⚔️${character.power}\``;
  });

  return new EmbedBuilder()
    .setTitle('📚 Liste des personnages')
    .setDescription(lines.join('\n') || 'Aucun personnage.')
    .setColor(0x5865f2)
    .setFooter({
      text: `Page ${page}/${totalPages} • ${totalCharacters} personnages`
    })
    .setTimestamp();
}

function buildButtons(page, totalPages) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`characters_prev_${page}`)
      .setLabel('⬅️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 1),

    new ButtonBuilder()
      .setCustomId(`characters_next_${page}`)
      .setLabel('➡️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages),
  );
}

async function sendPage(interaction, page, edit = false) {
  const totalCharacters = db.prepare(`
    SELECT COUNT(*) as count
    FROM characters
  `).get().count;

  const totalPages = Math.ceil(totalCharacters / PAGE_SIZE);

  if (page < 1) page = 1;
  if (page > totalPages) page = totalPages;

  const offset = (page - 1) * PAGE_SIZE;

  const characters = db.prepare(`
    SELECT *
    FROM characters
    ORDER BY power DESC
    LIMIT ?
    OFFSET ?
  `).all(PAGE_SIZE, offset);

  const embed = buildEmbed(
    page,
    totalPages,
    totalCharacters,
    characters
  );

  const row = buildButtons(page, totalPages);

  if (edit) {
    return interaction.update({
      embeds: [embed],
      components: [row]
    });
  }

  return interaction.editReply({
    embeds: [embed],
    components: [row]
  });
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
    if (!interaction.customId.startsWith('characters_')) {
      return;
    }

    const args = interaction.customId.split('_');

    const action = args[1];
    const currentPage = parseInt(args[2]);

    let newPage = currentPage;

    if (action === 'prev') {
      newPage--;
    }

    if (action === 'next') {
      newPage++;
    }

    await sendPage(interaction, newPage, true);
  }
};