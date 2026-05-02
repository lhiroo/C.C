const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('summon')
    .setDescription('Attire un membre dans ton salon vocal')
    .addUserOption(o => o.setName('cible').setDescription('Membre à attirer').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers),

  name: 'summon',

  async execute(ctx) {
    await ctx.defer();

    const cible   = ctx.isSlash ? ctx.source.options.getMember('cible') : ctx.source.mentions.members.first();
    const monSalon = ctx.source.member?.voice?.channel;

    if (!monSalon) return ctx.editReply('❌ Tu dois être dans un salon vocal.');
    if (!cible)    return ctx.editReply('❌ Membre introuvable.');
    if (!cible.voice.channel) return ctx.editReply(`❌ **${cible.displayName}** n'est pas dans un salon vocal.`);

    await cible.voice.setChannel(monSalon);
    await ctx.editReply(`🧲 **${cible.displayName}** a été attiré dans **${monSalon.name}**.`);
  },
};