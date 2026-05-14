const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { get, run, all }    = require('../db/query');
const { RARITIES }         = require('../systems/gacha/drops');
require('dotenv').config();

const OWNER_ID = process.env.OWNER_ID;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('give')
    .setDescription('[OWNER] Donne une carte à un membre')
    .addUserOption(o =>
      o.setName('cible').setDescription('Membre qui reçoit la carte').setRequired(true)
    )
    .addStringOption(o =>
      o.setName('personnage').setDescription('Nom du personnage (partiel accepté)').setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName('quantite').setDescription('Nombre de cartes à donner (défaut: 1)').setMinValue(1).setMaxValue(10)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  name: 'give',

  async execute(ctx) {
    await ctx.defer(true);

    // Vérification owner strict
    if (ctx.user.id !== OWNER_ID) {
      return ctx.editReply('❌ Cette commande est réservée au propriétaire du bot.');
    }

    const cible      = ctx.isSlash ? ctx.source.options.getUser('cible')      : ctx.source.mentions.users.first();
    const recherche  = ctx.isSlash ? ctx.source.options.getString('personnage'): ctx.args.join(' ');
    const quantite   = ctx.isSlash ? (ctx.source.options.getInteger('quantite') ?? 1) : 1;

    if (!cible)     return ctx.editReply('❌ Mentionne un utilisateur.');
    if (!recherche) return ctx.editReply('❌ Indique un nom de personnage.');

    // Chercher le personnage (recherche partielle, insensible à la casse)
    const matches = await all(
      `SELECT * FROM characters WHERE LOWER(name) LIKE LOWER(?) ORDER BY name LIMIT 10`,
      `%${recherche}%`
    );

    if (matches.length === 0) {
      return ctx.editReply(`❌ Aucun personnage trouvé pour **"${recherche}"**.`);
    }

    // Si plusieurs résultats → afficher la liste pour choisir
    if (matches.length > 1) {
      const liste = matches
        .map((c, i) => {
          const r = RARITIES[c.rarity];
          return `\`${i + 1}.\` ${r.emoji} **${c.name}** — *${c.anime}* (ID: ${c.id})`;
        })
        .join('\n');

      return ctx.editReply(
        `⚠️ Plusieurs personnages trouvés, précise le nom :\n\n${liste}\n\n` +
        `Utilise \`/give cible:"${cible.username}" personnage:"Nom Exact"\``
      );
    }

    const character = matches[0];
    const r         = RARITIES[character.rarity];

    // S'assurer que l'utilisateur existe dans gacha_users
    const userExists = await get(
      'SELECT id FROM gacha_users WHERE id = ? AND guild_id = ?',
      cible.id, ctx.guild.id
    );

    if (!userExists) {
      await run(
        'INSERT INTO gacha_users (id, guild_id, username) VALUES (?, ?, ?)',
        cible.id, ctx.guild.id, cible.username
      );
    }

    // Ajouter la/les carte(s)
    const cardIds = [];
    for (let i = 0; i < quantite; i++) {
      const result = await run(
        'INSERT INTO user_cards (user_id, guild_id, character_id) VALUES (?, ?, ?)',
        cible.id, ctx.guild.id, character.id
      );
      cardIds.push(result.lastInsertRowid);
    }

    // Notifier le destinataire en DM
    try {
      await cible.send(
        `🎁 Tu as reçu ${quantite > 1 ? `**${quantite}x** ` : ''}` +
        `${r.emoji} **${character.name}** *(${character.anime})* de la part du propriétaire du bot !`
      );
    } catch {
      // DMs fermés — pas grave
    }

    const idsStr = cardIds.map(id => `\`#${id}\``).join(', ');

    await ctx.editReply(
      `✅ **${quantite}x** ${r.emoji} **${character.name}** *(${r.label})* donné(s) à **${cible.username}**.\n` +
      `🃏 ID${quantite > 1 ? 's' : ''} de carte : ${idsStr}`
    );
  },
};