const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vclimit')
    .setDescription('Change la limite de membres d\'un salon vocal')
    .addIntegerOption(o =>
      o.setName('limite').setDescription('Nombre max de membres (0 = illimité)').setRequired(true).setMinValue(0).setMaxValue(99)
    )
    .addChannelOption(o => o.setName('salon').setDescription('Salon vocal (ton salon par défaut)'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  name: 'vclimit',

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

    await ctx.defer();

    const limite = ctx.isSlash ? ctx.source.options.getInteger('limite') : parseInt(ctx.args[0]);
    const salon  = ctx.isSlash
      ? (ctx.source.options.getChannel('salon') ?? ctx.source.member?.voice?.channel)
      : ctx.source.member?.voice?.channel;

    if (!salon) return ctx.editReply('❌ Aucun salon vocal trouvé.');
    if (isNaN(limite)) return ctx.editReply('❌ Indique un nombre valide.');

    await salon.setUserLimit(limite);

    await ctx.editReply(
      limite === 0
        ? `✅ **${salon.name}** est maintenant illimité.`
        : `✅ Limite de **${salon.name}** fixée à **${limite}** membre(s).`
    );
  },
};