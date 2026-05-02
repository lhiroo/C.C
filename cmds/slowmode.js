const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Définit le slowmode du salon')
    .addIntegerOption(o =>
      o.setName('secondes').setDescription('Délai en secondes (0 pour désactiver)').setRequired(true).setMinValue(0).setMaxValue(21600)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  name: 'slowmode',
  usage: 'cc slowmode 5',

  async execute(ctx) {

    if (!ctx.source?.member?.permissions?.has(PermissionFlagsBits.ManageChannels)) {
      const confirmation = await ctx.reply(
        "❌ Tu n'as pas les permissions nécessaires."
      );

      setTimeout(() => {
        confirmation.delete().catch(() => {});
      }, 4000);

      return;
    }

    const secondes = ctx.isSlash ? ctx.source.options.getInteger('secondes') : parseInt(ctx.args[0]);

    if (isNaN(secondes)) return ctx.reply('❌ Indique un nombre de secondes.');

    await ctx.channel.setRateLimitPerUser(secondes);

    if (secondes === 0) {
      await ctx.reply('✅ Slowmode désactivé.');
    } else {
      await ctx.reply(`⏱️ Slowmode réglé à **${secondes} secondes**.`);
    }
  },
};