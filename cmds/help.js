const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const CATEGORIES = {
  moderation: { emoji: '🛡️', label: 'Modération',  cmds: ['ban','kick','mute','unmute','warn','warnlist','clear','slowmode','nuke','lock','unlock'] },
  vocal:      { emoji: '🔊', label: 'Vocal',        cmds: ['vcinfo','vckick','vcmove','vcmute','vclock','vclimit','summon'] },
  fun:        { emoji: '🎮', label: 'Fun',           cmds: ['8ball','coinflip','ship','roulette'] },
  utilitaire: { emoji: '🔧', label: 'Utilitaire',   cmds: ['ping','say','avatar','userinfo','poll','remind','giveaway','confess'] },
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
    const embed = new EmbedBuilder()
      .setTitle('📖 Commandes disponibles')
      .setColor(0x5865f2)
      .setFooter({ text: 'Utilise /help <catégorie> pour plus de détails' });

    for (const [, cat] of Object.entries(CATEGORIES)) {
      embed.addFields({
        name:  `${cat.emoji} ${cat.label} (${cat.cmds.length})`,
        value: cat.cmds.map(c => `\`${c}\``).join(' '),
      });
    }

    await ctx.editReply({ embeds: [embed] });
  },
};