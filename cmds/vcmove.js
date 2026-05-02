const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vcmove')
    .setDescription('Déplace tous les membres d\'un salon vocal vers un autre')
    .addChannelOption(o =>
      o.setName('source').setDescription('Salon source').setRequired(true)
    )
    .addChannelOption(o =>
      o.setName('destination').setDescription('Salon destination').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers),

  name: 'vcmove',

  async execute(ctx) {

    if (!ctx.source?.member?.permissions?.has(PermissionFlagsBits.MoveMembers)) {
      const confirmation = await ctx.reply(
        "❌ Tu n'as pas les permissions nécessaires."
      );

      setTimeout(() => {
        confirmation.delete().catch(() => {});
      }, 4000);

      return;
    }

    await ctx.defer();

    const source = ctx.isSlash ? ctx.source.options.getChannel('source')      : ctx.source.mentions.channels.first();
    const dest   = ctx.isSlash ? ctx.source.options.getChannel('destination') : ctx.source.mentions.channels.at(1);

    if (!source || !dest) return ctx.editReply('❌ Précise les deux salons.');
    if (source.type !== ChannelType.GuildVoice) return ctx.editReply('❌ Le salon source doit être un salon vocal.');
    if (dest.type   !== ChannelType.GuildVoice) return ctx.editReply('❌ Le salon destination doit être un salon vocal.');

    const membres = [...source.members.values()];
    if (membres.length === 0) return ctx.editReply('❌ Le salon source est vide.');

    let déplacés = 0;
    for (const membre of membres) {
      await membre.voice.setChannel(dest).catch(() => {});
      déplacés++;
    }

    await ctx.editReply(`✅ **${déplacés}** membre(s) déplacé(s) de **${source.name}** vers **${dest.name}**.`);
  },
};