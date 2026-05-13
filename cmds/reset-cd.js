const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { get, run } = require('../db/query');

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
    ),

  name: 'reset-cd',
  aliases: ['resetcd', 'reset-cooldown'],

  async execute(ctx) {
    await ctx.defer();

    // Vérif permissions pour cibler quelqu'un d'autre
    const type   = ctx.isSlash ? ctx.source.options.getString('type')        : ctx.args[0];
    const target = ctx.isSlash ? ctx.source.options.getUser('utilisateur')   : null;

    if (!['roll', 'claim', 'both'].includes(type)) {
      return ctx.editReply('❌ Type invalide. Utilise `roll`, `claim` ou `both`.');
    }

    const targetUser = target ?? ctx.user;

    // Vérif : seul un admin peut reset quelqu'un d'autre
    const isAdmin = ctx.member?.permissions?.has(PermissionFlagsBits.Administrator);
    if (targetUser.id !== ctx.user.id && !isAdmin) {
      return ctx.editReply('❌ Tu n\'as pas la permission de reset le cooldown d\'un autre utilisateur.');
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