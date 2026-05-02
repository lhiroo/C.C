const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Verrouille le salon (personne ne peut envoyer de messages)')
    .addChannelOption(o => o.setName('salon').setDescription('Salon à verrouiller (actuel par défaut)'))
    .addStringOption(o => o.setName('raison').setDescription('Raison'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  name: 'lock',

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

    const salon = ctx.isSlash ? (ctx.source.options.getChannel('salon') ?? ctx.channel) : ctx.channel;
    const raison = ctx.isSlash ? ctx.source.options.getString('raison') : ctx.args.join(' ') || 'Aucune raison';

    await salon.permissionOverwrites.edit(ctx.guild.roles.everyone, {
      SendMessages: false,
    });

    await salon.send(`🔒 Salon verrouillé par <@${ctx.user.id}>.\n📝 Raison : ${raison}`);

    if (ctx.isSlash && salon.id !== ctx.channel.id) {
      await ctx.replyEphemeral(`✅ <#${salon.id}> verrouillé.`);
    }
  },
};