const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vclock')
    .setDescription('Verrouille ou déverrouille un salon vocal')
    .addStringOption(o =>
      o.setName('action').setDescription('Action').setRequired(true)
       .addChoices(
         { name: '🔒 Verrouiller',   value: 'lock'   },
         { name: '🔓 Déverrouiller', value: 'unlock' },
       )
    )
    .addChannelOption(o => o.setName('salon').setDescription('Salon vocal (ton salon par défaut)'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  name: 'vclock',

  async execute(ctx) {

    if (!ctx.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      const confirmation = await ctx.reply(
        "❌ Tu n'as pas les permissions nécessaires."
      );

      setTimeout(() => {
        confirmation.delete().catch(() => {});
      }, 4000);

      return;
    }

    await ctx.defer();

    const action = ctx.isSlash ? ctx.source.options.getString('action') : ctx.args[0];
    const salon  = ctx.isSlash
      ? (ctx.source.options.getChannel('salon') ?? ctx.source.member?.voice?.channel)
      : ctx.source.member?.voice?.channel;

    if (!salon || salon.type !== ChannelType.GuildVoice) {
      return ctx.editReply('❌ Aucun salon vocal valide trouvé.');
    }

    const lock = action === 'lock';

    // Empêcher @everyone de rejoindre
    await salon.permissionOverwrites.edit(ctx.guild.roles.everyone, {
      Connect: lock ? false : null, // null = retour à l'état par défaut
    });

    await ctx.editReply(
      lock
        ? `🔒 **${salon.name}** est verrouillé — personne ne peut rejoindre.`
        : `🔓 **${salon.name}** est déverrouillé.`
    );
  },
};