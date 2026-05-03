const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const musicQueue = require('../systems/musicQueue');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Joue une musique YouTube')
    .addStringOption(o =>
      o.setName('query').setDescription('URL ou titre de la musique').setRequired(true)
    ),

  name: 'play',

  async execute(ctx) {
    await ctx.defer();

    const query = ctx.isSlash ? ctx.source.options.getString('query') : ctx.args.join(' ');
    if (!query) return ctx.editReply('❌ Indique un titre ou une URL.');

    const vc = ctx.source.member?.voice?.channel;
    if (!vc) return ctx.editReply('❌ Tu dois être dans un salon vocal.');

    // Vérifier que le bot peut rejoindre
    const perms = vc.permissionsFor(ctx.guild.members.me);
    if (!perms.has('Connect') || !perms.has('Speak')) {
      return ctx.editReply('❌ Je n\'ai pas la permission de rejoindre ton salon vocal.');
    }

    try {
      const { track, position } = await musicQueue.add(
        ctx.guild,
        vc,
        ctx.channel,
        query,
      );

      track.requestedBy = ctx.user.username;

      // Si déjà en train de jouer → confirmer l'ajout à la queue
      const queue = musicQueue.get(ctx.guild.id);
      if (queue?.current && queue.current.url !== track.url) {
        const embed = new EmbedBuilder()
          .setTitle('➕ Ajouté à la file')
          .setDescription(`**[${track.title}](${track.url})**`)
          .setThumbnail(track.thumbnail)
          .addFields(
            { name: 'Position', value: `#${position}`, inline: true },
            { name: 'Durée',    value: track.duration > 0 ? `${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2,'0')}` : 'Live', inline: true },
          )
          .setColor(0x1db954);

        return ctx.editReply({ embeds: [embed] });
      }

      await ctx.editReply('▶️ Lecture lancée !');

    } catch (err) {
      console.error('[play]', err);
      await ctx.editReply(`❌ ${err.message}`);
    }
  },
};