const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { get, run } = require('../db/query');
require('dotenv').config();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reset-cd')
    .setDescription('Reset le cooldown de claim ou de roll d\'un utilisateur')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Type de cooldown à reset')
        .setRequired(true)
        .addChoices(
          { name: '🎲 Roll',  value: 'roll'  },
          { name: '✋ Claim', value: 'claim' },
          { name: '🔄 Les deux', value: 'both' },
        )
    )
    .addUserOption(option =>
      option.setName('utilisateur')
        .setDescription('Utilisateur ciblé (vous-même par défaut)')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  name: 'reset-cd',
  aliases: ['resetcd', 'reset-cooldown'],

  async execute(ctx) {
    await ctx.defer();

    if (ctx.user.id !== process.env.OWNER_ID) {
      return ctx.editReply('❌ Tu ne peux pas utiliser cette commande.');
    }

    // Vérif permissions pour cibler quelqu'un d'autre
    const type   = ctx.isSlash ? ctx.source.options.getString('type')        : ctx.args[0];
    const targetUser = ctx.isSlash ? (ctx.source.options.getUser('utilisateur') ?? ctx.user)   : (ctx.source.mentions.users.first() ?? ctx.user);

    if (!['roll', 'claim', 'both'].includes(type)) {
      return ctx.editReply('❌ Type invalide. Utilise `roll`, `claim` ou `both`.');
    }

    const user = await get(
      'SELECT * FROM gacha_users WHERE id = ? AND guild_id = ?',
      targetUser.id, ctx.guild.id
    );

    if (!user) {
      return ctx.editReply(`❌ **${targetUser.username}** n'a pas encore joué sur ce serveur.`);
    }

    // Appliquer le reset selon le type
    if (type === 'roll' || type === 'both') {
      await run(
        'UPDATE gacha_users SET roll_count = 0, roll_reset = 0 WHERE id = ? AND guild_id = ?',
        targetUser.id, ctx.guild.id
      );
    }

    if (type === 'claim' || type === 'both') {
      await run(
        'UPDATE gacha_users SET last_claim = 0 WHERE id = ? AND guild_id = ?',
        targetUser.id, ctx.guild.id
      );
    }

    const labels = { roll: '🎲 Roll', claim: '✋ Claim', both: '🎲 Roll + ✋ Claim' };

    const embed = new EmbedBuilder()
      .setTitle('✅ Cooldown réinitialisé')
      .addFields(
        { name: 'Utilisateur', value: `<@${targetUser.id}>`, inline: true },
        { name: 'Type',        value: labels[type],          inline: true },
        { name: 'Par',         value: `<@${ctx.user.id}>`,   inline: true },
      )
      .setColor(0x2ecc71)
      .setTimestamp();

    return ctx.editReply({ embeds: [embed] });
  }
};