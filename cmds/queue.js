const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const musicQueue = require('../systems/musicQueue');

const PAGE_SIZE = 10;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Affiche la file d\'attente')
    .addIntegerOption(o => o.setName('page').setDescription('Numéro de page').setMinValue(1)),

  name: 'queue',
  aliases: ['q', 'file'],

  async execute(ctx) {
    await ctx.defer();

    const queue = musicQueue.get(ctx.guild.id);
    if (!queue || (!queue.current && queue.tracks.length === 0)) {
      return ctx.editReply('📭 La file d\'attente est vide.');
    }

    const page     = (ctx.isSlash ? ctx.source.options.getInteger('page') : parseInt(ctx.args[0])) || 1;
    const totalPages = Math.ceil(queue.tracks.length / PAGE_SIZE) || 1;
    const start    = (page - 1) * PAGE_SIZE;
    const pageTracks = queue.tracks.slice(start, start + PAGE_SIZE);

    const fmtDur = s => s > 0 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2,'0')}` : 'Live';

    const lignes = pageTracks.map((t, i) =>
      `\`${start + i + 1}.\` [${t.title}](${t.url}) — \`${fmtDur(t.duration)}\``
    ).join('\n') || '*Pas d\'autres tracks*';

    const totalDur = queue.tracks.reduce((acc, t) => acc + t.duration, 0);

    const embed = new EmbedBuilder()
      .setTitle(`🎶 File d'attente — ${ctx.guild.name}`)
      .addFields(
        {
          name:  '▶️ En cours',
          value: queue.current ? `[${queue.current.title}](${queue.current.url})` : '*Rien*',
        },
        {
          name:  `📋 File (${queue.tracks.length} tracks)`,
          value: lignes,
        },
      )
      .setFooter({
        text: `Page ${page}/${totalPages} • Durée totale : ${fmtDur(totalDur)} • Loop : ${queue.loop} • Volume : ${queue.volume}%`,
      })
      .setColor(0x1db954);

    await ctx.editReply({ embeds: [embed] });
  },
};