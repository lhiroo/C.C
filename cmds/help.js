const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const CATEGORIES = {
  moderation: {
    emoji: '🛡️',
    label: 'Modération',
    cmds: ['ban', 'kick', 'mute', 'unmute', 'warn', 'warnlist', 'clear', 'slowmode', 'nuke', 'lock', 'unlock'],
  },
  vocal: {
    emoji: '🔊',
    label: 'Vocal',
    cmds: ['vcinfo', 'vckick', 'vcmove', 'vcmute', 'vclock', 'vclimit', 'summon'],
  },
  musique: {
    emoji: '🎵',
    label: 'Musique',
    cmds: ['play', 'queue', 'skip', 'pause', 'resume', 'stop', 'volume', 'loop', 'shuffle', 'nowplaying'],
  },
  fun: {
    emoji: '🎮',
    label: 'Fun',
    cmds: ['8ball', 'coinflip', 'ship', 'roulette'],
  },
  utilitaire: {
    emoji: '🔧',
    label: 'Utilitaire',
    cmds: ['ping', 'pp', 'userinfo', 'poll', 'remind', 'giveaway', 'confess'],
  },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Affiche toutes les commandes disponibles')
    .addStringOption(o =>
      o.setName('categorie').setDescription('Catégorie spécifique')
       .addChoices(
         { name: '🛡️ Modération', value: 'moderation' },
         { name: '🔊 Vocal',      value: 'vocal'      },
         { name: '🎵 Musique',    value: 'musique'    },
         { name: '🎮 Fun',        value: 'fun'        },
         { name: '🔧 Utilitaire', value: 'utilitaire' },
       )
    ),

  name: 'help',

  async execute(ctx) {
    await ctx.defer();

    const categorie = ctx.isSlash ? ctx.source.options.getString('categorie') : ctx.args[0];

    if (categorie && CATEGORIES[categorie]) {
      const cat   = CATEGORIES[categorie];
      const embed = new EmbedBuilder()
        .setTitle(`${cat.emoji} ${cat.label}`)
        .setDescription(cat.cmds.map(c => `\`/${c}\``).join('  '))
        .setColor(0x5865f2);
      return ctx.editReply({ embeds: [embed] });
    }

    // Vue globale
    const total = Object.values(CATEGORIES).reduce((acc, cat) => acc + cat.cmds.length, 0);

    const embed = new EmbedBuilder()
      .setTitle('📖 Commandes disponibles')
      .setDescription(`**${total} commandes** réparties en ${Object.keys(CATEGORIES).length} catégories.\nUtilise \`/help <catégorie>\` pour plus de détails.`)
      .setColor(0x5865f2)
      .setTimestamp();

    for (const cat of Object.values(CATEGORIES)) {
      embed.addFields({
        name:  `${cat.emoji} ${cat.label} (${cat.cmds.length})`,
        value: cat.cmds.map(c => `\`${c}\``).join(' '),
      });
    }

    await ctx.editReply({ embeds: [embed] });
  },
};