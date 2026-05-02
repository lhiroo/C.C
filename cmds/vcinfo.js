const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vcinfo')
    .setDescription('Affiche les infos du salon vocal où tu es'),

  name: 'vcinfo',

  async execute(ctx) {
    await ctx.defer();

    const vc = ctx.source.member?.voice?.channel;
    if (!vc) return ctx.editReply('❌ Tu n\'es pas dans un salon vocal.');

    const membres = vc.members.filter(m => !m.user.bot);
    const bots    = vc.members.filter(m => m.user.bot);
    const muted   = vc.members.filter(m => m.voice.selfMute || m.voice.serverMute);
    const deafened = vc.members.filter(m => m.voice.selfDeaf || m.voice.serverDeaf);
    const streaming = vc.members.filter(m => m.voice.streaming);

    const liste = [...membres.values()]
      .map(m => {
        const icons = [
          m.voice.selfMute || m.voice.serverMute ? '🔇' : '🎙️',
          m.voice.selfDeaf || m.voice.serverDeaf ? '🔕' : '',
          m.voice.streaming ? '📺' : '',
          m.voice.selfVideo ? '📷' : '',
        ].filter(Boolean).join('');
        return `${icons} ${m.displayName}`;
      })
      .join('\n') || 'Aucun membre';

    const embed = new EmbedBuilder()
      .setTitle(`🔊 ${vc.name}`)
      .setColor(0x5865f2)
      .addFields(
        { name: '👥 Membres',     value: `${membres.size}/${vc.userLimit || '∞'}`, inline: true },
        { name: '🤖 Bots',        value: `${bots.size}`,                            inline: true },
        { name: '🔇 Muet',        value: `${muted.size}`,                           inline: true },
        { name: '🔕 Sourd',       value: `${deafened.size}`,                        inline: true },
        { name: '📺 Stream',      value: `${streaming.size}`,                       inline: true },
        { name: '🔑 Bitrate',     value: `${vc.bitrate / 1000}kbps`,               inline: true },
        { name: '👤 Participants', value: liste,                                     inline: false },
      )
      .setFooter({ text: `ID : ${vc.id}` });

    await ctx.editReply({ embeds: [embed] });
  },
};