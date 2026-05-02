const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vcmute')
    .setDescription('Mute ou unmute tous les membres du salon vocal')
    .addStringOption(o =>
      o.setName('action').setDescription('Action').setRequired(true)
       .addChoices(
         { name: '🔇 Mute tout le monde',   value: 'mute'   },
         { name: '🔊 Unmute tout le monde',  value: 'unmute' },
       )
    )
    .addChannelOption(o => o.setName('salon').setDescription('Salon cible (ton salon par défaut)'))
    .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers),

  name: 'vcmute',

  async execute(ctx) {

    if (!ctx.source?.member?.permissions?.has(PermissionFlagsBits.MuteMembers)) {
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

    if (!salon) return ctx.editReply('❌ Aucun salon vocal trouvé.');

    const muter  = action === 'mute';
    const membres = salon.members.filter(m => !m.user.bot);

    let compteur = 0;
    for (const membre of membres.values()) {
      await membre.voice.setMute(muter).catch(() => {});
      compteur++;
    }

    const emoji = muter ? '🔇' : '🔊';
    await ctx.editReply(`${emoji} **${compteur}** membre(s) ${muter ? 'mutés' : 'unmutés'} dans **${salon.name}**.`);
  },
};