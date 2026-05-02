const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban un membre')
    .addUserOption(o => o.setName('cible').setDescription('Membre à bannir').setRequired(true))
    .addStringOption(o => o.setName('raison').setDescription('Raison'))
    .addIntegerOption(o => o.setName('jours').setDescription('Jours de messages à supprimer (0-7)').setMinValue(0).setMaxValue(7))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  name: 'ban',
  usage: 'cc ban @utilisateur [raison]',

  async execute(ctx) {

    if (!ctx.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      const confirmation = await ctx.reply(
        "❌ Tu n'as pas les permissions nécessaires."
      );

      setTimeout(() => {
        confirmation.delete().catch(() => {});
      }, 4000);

      return;
    }

    const cible  = ctx.isSlash ? ctx.source.options.getUser('cible')         : ctx.source.mentions.users.first();
    const raison = ctx.isSlash ? ctx.source.options.getString('raison')       : ctx.args.slice(1).join(' ') || 'Aucune raison';
    const jours  = ctx.isSlash ? (ctx.source.options.getInteger('jours') ?? 0): 0;

    if (!cible) return ctx.reply('❌ Mentionne un utilisateur.');

    const member = ctx.guild.members.cache.get(cible.id);

    if (!member) return ctx.reply('❌ Membre introuvable sur ce serveur.');
    if (!member.bannable) return ctx.reply('❌ Je ne peux pas bannir ce membre (rôle supérieur au mien).');

    await member.ban({ deleteMessageDays: jours, reason: raison });
    await ctx.reply(`🔨 **${cible.tag}** a été banni.\n📝 Raison : ${raison}`);
  },
};