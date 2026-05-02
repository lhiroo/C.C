const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { warnings } = require('./warn'); // réutilise le même Map

// Note : exporte warnings depuis warn.js → ajoute "module.exports.warnings = warnings;" à la fin de warn.js

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn-list')
    .setDescription('Affiche les avertissements d\'un membre')
    .addUserOption(o => o.setName('cible').setDescription('Membre').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  name: 'warnlist',
  usage: 'cc warnlist @utilisateur',

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

    const cible = ctx.isSlash ? ctx.source.options.getUser('cible') : ctx.source.mentions.users.first();
    if (!cible) return ctx.reply('❌ Mentionne un utilisateur.');

    const guildWarns = warnings.get(ctx.guild.id)?.get(cible.id) ?? [];

    if (guildWarns.length === 0) {
      return ctx.reply(`✅ **${cible.tag}** n'a aucun avertissement.`);
    }

    const embed = new EmbedBuilder()
      .setTitle(`⚠️ Avertissements de ${cible.tag}`)
      .setColor(0xf39c12)
      .setDescription(guildWarns.map((r, i) => `**${i + 1}.** ${r}`).join('\n'))
      .setFooter({ text: `${guildWarns.length} avertissement(s)` });

    await ctx.reply({ embeds: [embed] });
  },
};