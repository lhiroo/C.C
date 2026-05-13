const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { get }                               = require('../db/query');
const { findCharacter }                     = require('../systems/gacha/roller');
const { RARITIES }                          = require('../systems/gacha/drops');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('character')
    .setDescription("Affiche les détails d'un personnage")
    .addStringOption(option =>
      option.setName('nom').setDescription('Nom du personnage').setRequired(true)
    ),

  name: 'character',
  aliases: ['char', 'perso'],

  async execute(ctx) {
    await ctx.defer();

    let search = ctx.isSlash ? ctx.source.options.getString('nom') : ctx.args.join(' ');
    if (!search) return ctx.editReply('❌ Tu dois préciser un nom de personnage.');

    const character = findCharacter(search.trim()); // ← mémoire, 0ms réseau
    if (!character) return ctx.editReply(`❌ Aucun personnage trouvé pour : **${search}**`);

    const rarity = RARITIES[character.rarity.toLowerCase()];
    if (!rarity) return ctx.editReply('❌ La rareté du personnage est invalide.');

    // Seule requête DB restante : nb de copies possédées (donnée joueur, pas cacheable)
    const owned = await get(
      'SELECT COUNT(*) as count FROM user_cards WHERE character_id = ?',
      character.id
    );

    const embed = new EmbedBuilder()
      .setTitle(`${rarity.emoji} ${character.name}`)
      .setDescription(`**${character.anime}**\n\n*${character.description ?? 'Aucune description.'}*`)
      .setImage(character.image_url)
      .setColor(rarity.color)
      .addFields(
        { name: '✨ Rareté',    value: rarity.label,         inline: true },
        { name: '⚔️ Puissance', value: `${character.power}`, inline: true },
        { name: '👥 Possédé',   value: `${owned?.count ?? 0} fois`, inline: true },
      )
      .setFooter({ text: `Demandé par ${ctx.user.username}` })
      .setTimestamp();

    return ctx.editReply({ embeds: [embed] });
  }
};