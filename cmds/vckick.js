const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vckick')
    .setDescription('Expulse un membre d\'un salon vocal')
    .addUserOption(o => o.setName('cible').setDescription('Membre à expulser').setRequired(true))
    .addStringOption(o => o.setName('raison').setDescription('Raison'))
    .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers),

  name: 'vckick',

  async execute(ctx) {

    if (!ctx.member.permissions.has(PermissionFlagsBits.MoveMembers)) {
      const confirmation = await ctx.reply(
        "❌ Tu n'as pas les permissions nécessaires."
      );

      setTimeout(() => {
        confirmation.delete().catch(() => {});
      }, 4000);

      return;
    }

    await ctx.defer();

    const cible  = ctx.isSlash ? ctx.source.options.getMember('cible')    : ctx.source.mentions.members.first();
    const raison = ctx.isSlash ? ctx.source.options.getString('raison')   : ctx.args.slice(1).join(' ') || 'Aucune raison';

    if (!cible) return ctx.editReply('❌ Membre introuvable.');
    if (!cible.voice.channel) return ctx.editReply('❌ Ce membre n\'est pas dans un salon vocal.');

    const nomSalon = cible.voice.channel.name;

    // Déconnecter = setChannel(null)
    await cible.voice.disconnect(raison);

    await ctx.editReply(`👢 **${cible.displayName}** a été expulsé de **${nomSalon}**.\n📝 Raison : ${raison}`);
  },
};