const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getCollection } = require('../systems/collection/inventory');
const { RARITIES }      = require('../systems/gacha/drops');

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

    const cible  = ctx.isSlash ? (ctx.source.options.getUser('joueur') ?? ctx.user) : (ctx.source.mentions.users.first() ?? ctx.user);
    const page = ctx.isSlash
  ? (ctx.source.options.getInteger('page') ?? 1)
  : (parseInt(ctx.args.find(a => !a.startsWith('<@'))) || 1);
  
    const rarity = ctx.isSlash ? ctx.source.options.getString('rarity') : null;

    const { cards, total, totalPages } = await getCollection(cible.id, ctx.guild.id, page, rarity);

    if (cards.length === 0) {
      return ctx.editReply(`📭 ${cible.id === ctx.user.id ? 'Tu n\'as' : `**${cible.username}** n'a`} aucune carte${rarity ? ` de rareté **${RARITIES[rarity].label}**` : ''}.`);
    }

    const lignes = cards.map(c => {
      const r   = RARITIES[c.rarity];
      const fav = c.is_favorite ? '⭐ ' : '';
      return `${fav}${r.emoji} **${c.name}** — *${c.anime}* \`⚔️${c.power}\` \`#${c.card_id}\``;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setTitle(`📦 Collection de ${cible.username}`)
      .setDescription(lignes)
      .setColor(0x5865f2)
      .setFooter({ text: `${total} carte(s) • Page ${page}/${totalPages}` })
      .setThumbnail(cible.displayAvatarURL());

    await ctx.editReply({ embeds: [embed] });
  },
};