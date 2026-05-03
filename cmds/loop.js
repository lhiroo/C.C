const { SlashCommandBuilder } = require('discord.js');
const musicQueue = require('../systems/musicQueue');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Change le mode de répétition')
    .addStringOption(o =>
      o.setName('mode').setDescription('Mode').setRequired(true)
       .addChoices(
         { name: '➡️ Désactivé',    value: 'off'   },
         { name: '🔂 Track actuel', value: 'track' },
         { name: '🔁 Toute la file', value: 'queue' },
       )
    ),

  name: 'loop',

  async execute(ctx) {
    await ctx.defer();

    const mode = ctx.isSlash ? ctx.source.options.getString('mode') : ctx.args[0];
    if (!['off', 'track', 'queue'].includes(mode)) {
      return ctx.editReply('❌ Mode invalide. Options : `off`, `track`, `queue`');
    }

    const ok = musicQueue.setLoop(ctx.guild.id, mode);
    if (!ok) return ctx.editReply('❌ Aucune musique en cours.');

    const labels = { off: '➡️ Loop désactivé', track: '🔂 Loop sur le track actuel', queue: '🔁 Loop sur toute la file' };
    await ctx.editReply(labels[mode]);
  },
};