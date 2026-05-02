const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const DUREES = {
  '60s':  60 * 1000,
  '5m':   5  * 60 * 1000,
  '10m':  10 * 60 * 1000,
  '1h':   60 * 60 * 1000,
  '24h':  24 * 60 * 60 * 1000,
  '7j':   7  * 24 * 60 * 60 * 1000,
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Met un membre en sourdine temporaire')
    .addUserOption(o => o.setName('cible').setDescription('Membre').setRequired(true))
    .addStringOption(o =>
      o.setName('duree').setDescription('Durée').setRequired(true)
       .addChoices(
         { name: '60 secondes', value: '60s' },
         { name: '5 minutes',   value: '5m'  },
         { name: '10 minutes',  value: '10m' },
         { name: '1 heure',     value: '1h'  },
         { name: '24 heures',   value: '24h' },
         { name: '7 jours',     value: '7j'  },
       )
    )
    .addStringOption(o => o.setName('raison').setDescription('Raison'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  name: 'mute',
  usage: 'cc mute @utilisateur 10m [raison]',

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

    const cible    = ctx.isSlash ? ctx.source.options.getUser('cible')    : ctx.source.mentions.users.first();
    const dureeKey = ctx.isSlash ? ctx.source.options.getString('duree')  : ctx.args[1];
    const raison   = ctx.isSlash ? ctx.source.options.getString('raison') : ctx.args.slice(2).join(' ') || 'Aucune raison';

    if (!cible) return ctx.reply('❌ Mentionne un utilisateur.');

    const ms = DUREES[dureeKey];
    if (!ms) return ctx.reply(`❌ Durée invalide. Options : ${Object.keys(DUREES).join(', ')}`);

    const member = ctx.guild.members.cache.get(cible.id);
    if (!member) return ctx.reply('❌ Membre introuvable.');

    await member.timeout(ms, raison);
    await ctx.reply(`🔇 **${cible.tag}** est mute pendant **${dureeKey}**.\n📝 Raison : ${raison}`);
  },
};