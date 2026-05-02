const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulse un membre')
    .addUserOption(o => o.setName('cible').setDescription('Membre à expulser').setRequired(true))
    .addStringOption(o => o.setName('raison').setDescription('Raison'))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  name: 'kick',
  usage: 'cc kick @utilisateur [raison]',

  async execute(ctx) {

    if (!ctx.source?.member?.permissions?.has(PermissionFlagsBits.KickMembers)) {
      const confirmation = await ctx.reply(
        "❌ Tu n'as pas les permissions nécessaires."
      );

      setTimeout(() => {
        confirmation.delete().catch(() => {});
      }, 4000);

      return;
    }

    const cible  = ctx.isSlash ? ctx.source.options.getUser('cible')   : ctx.source.mentions.users.first();
    const raison = ctx.isSlash ? ctx.source.options.getString('raison') : ctx.args.slice(1).join(' ') || 'Aucune raison';

    if (!cible) return ctx.reply('❌ Mentionne un utilisateur.');

    const member = ctx.guild.members.cache.get(cible.id);
    if (!member?.kickable) return ctx.reply('❌ Je ne peux pas expulser ce membre.');

    await member.kick(raison);
    await ctx.reply(`👢 **${cible.tag}** a été expulsé.\n📝 Raison : ${raison}`);
  },
};