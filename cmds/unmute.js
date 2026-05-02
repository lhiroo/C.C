const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Démute un membre')
    .addUserOption(o => o.setName('cible').setDescription('Membre').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  name: 'unmute',
  usage: 'cc unmute @utilisateur',

  async execute(ctx) {

    if (!ctx.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      const confirmation = await ctx.reply(
        "❌ Tu n'as pas les permissions nécessaires."
      );

      setTimeout(() => {
        confirmation.delete().catch(() => {});
      }, 4000);

      return;
    }

    const cible  = ctx.isSlash ? ctx.source.options.getUser('cible') : ctx.source.mentions.users.first();
    if (!cible) return ctx.reply('❌ Mentionne un utilisateur.');

    const member = ctx.guild.members.cache.get(cible.id);
    if (!member) return ctx.reply('❌ Membre introuvable.');

    await member.timeout(null);
    await ctx.reply(`🔊 **${cible.tag}** à été démute.`);
  },
};