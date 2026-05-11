const {
  SlashCommandBuilder,
  EmbedBuilder
} = require('discord.js');

const db = require('../db/database');
const { RARITIES } = require('../systems/gacha/drops');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('character')
    .setDescription('Affiche les détails d’un personnage')
    .addStringOption(option =>
      option
        .setName('nom')
        .setDescription('Nom du personnage')
        .setRequired(true)
    ),

  name: 'character',
  aliases: ['char', 'perso'],

  async execute(ctx) {
    await ctx.defer();

    // Slash command
    let search;

    if (ctx.isSlash) {
      search = ctx.source.options.getString('nom');
    }

    // Prefix command
    else {
      search = ctx.args.join(' ');
    }

    if (!search) {
      return ctx.editReply(
        '❌ Tu dois préciser un nom de personnage.'
      );
    }

    search = search.trim();

    // Recherche du personnage
    const character = db.prepare(`
      SELECT *
      FROM characters
      WHERE LOWER(name) LIKE LOWER(?)
      LIMIT 1
    `).get(`%${search}%`);

    if (!character) {
      return ctx.editReply(
        `❌ Aucun personnage trouvé pour : **${search}**`
      );
    }

    const rarity = RARITIES[character.rarity.toLowerCase()];

    if (!rarity) {
      return ctx.editReply(
        '❌ La rareté du personnage est invalide.'
      );
    }

    // Nombre total possédé
    const owned = db.prepare(`
      SELECT COUNT(*) as count
      FROM user_cards
      WHERE character_id = ?
    `).get(character.id);

    const embed = new EmbedBuilder()
      .setTitle(`${rarity.emoji} ${character.name}`)
      .setDescription(
        `**${character.anime}**\n\n*${character.description ?? 'Aucune description.'}*`
      )
      .setImage(character.image_url)
      .setColor(rarity.color)
      .addFields(
        {
          name: '✨ Rareté',
          value: rarity.label,
          inline: true
        },
        {
          name: '⚔️ Puissance',
          value: `${character.power}`,
          inline: true
        },
        /*{
          name: '❤️ Santé',
          value: `${character.health}`,
          inline: true
        },
        {
          name: '💨 Vitesse',
          value: `${character.speed}`,
          inline: true
        },*/
        /*{
          name: '🆔 ID',
          value: `${character.id}`,
          inline: true
        }*/
      )
      .setFooter({
        text: `Demandé par ${ctx.user.username}`
      })
      .setTimestamp();

    return ctx.editReply({
      embeds: [embed]
    });
  }
};