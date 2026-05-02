const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Déverrouille le salon')
    .addChannelOption(o => o.setName('salon').setDescription('Salon à déverrouiller (actuel par défaut)'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  name: 'unlock',

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

    const salon = ctx.isSlash ? (ctx.source.options.getChannel('salon') ?? ctx.channel) : ctx.channel;

    await salon.permissionOverwrites.edit(ctx.guild.roles.everyone, {
      SendMessages: null, // null = retour aux permissions par défaut
    });

    await salon.send(`🔓 Salon déverrouillé par <@${ctx.user.id}>.`);

    if (ctx.isSlash && salon.id !== ctx.channel.id) {
      await ctx.replyEphemeral(`✅ <#${salon.id}> déverrouillé.`);
    }
  },
};