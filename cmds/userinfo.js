const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Infos détaillées sur un utilisateur')
    .addUserOption(o => o.setName('cible').setDescription('Utilisateur (toi par défaut)')),

  name: 'userinfo',
  aliases: ['ui', 'whois'],

  async execute(ctx) {
    const cible = ctx.isSlash
      ? (ctx.source.options.getMember('cible') ?? ctx.source.member)
      : (ctx.source.mentions.members.first() ?? ctx.source.member);

    const user   = cible.user;
    const roles  = cible.roles.cache
      .filter(r => r.id !== ctx.guild.id)
      .sort((a, b) => b.position - a.position)
      .map(r => `<@&${r.id}>`)
      .slice(0, 10)
      .join(' ') || 'Aucun';

    const flags = {
      Staff:                   '👨‍💼 Staff Discord',
      Partner:                 '🤝 Partenaire',
      Hypesquad:               '🏠 HypeSquad',
      BugHunterLevel1:         '🐛 Bug Hunter',
      BugHunterLevel2:         '🐛 Bug Hunter Gold',
      HypeSquadOnlineHouse1:   '🏠 Bravery',
      HypeSquadOnlineHouse2:   '🏠 Brilliance',
      HypeSquadOnlineHouse3:   '🏠 Balance',
      PremiumEarlySupporter:   '⭐ Early Supporter',
      VerifiedDeveloper:       '🔧 Dev vérifié',
      ActiveDeveloper:         '🔧 Dev actif',
      CertifiedModerator:      '🛡️ Modérateur certifié',
    };

    const badgesList = user.flags?.toArray()
      .map(f => flags[f])
      .filter(Boolean)
      .join('\n') || 'Aucun';

    const embed = new EmbedBuilder()
      .setTitle(`${user.username}`)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .setColor(cible.displayHexColor || 0x5865f2)
      .addFields(
        { name: '🪪 ID',             value: user.id,                                                    inline: true  },
        { name: '🤖 Bot',            value: user.bot ? 'Oui' : 'Non',                                  inline: true  },
        { name: '📅 Compte créé',    value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`,        inline: true  },
        { name: '📥 A rejoint le',   value: `<t:${Math.floor(cible.joinedTimestamp / 1000)}:R>`,        inline: true  },
        { name: '🎭 Rôle principal', value: `<@&${cible.roles.highest.id}>`,                           inline: true  },
        { name: '🏷️ Pseudo serveur', value: cible.displayName,                                         inline: true  },
        { name: `🎖️ Rôles (${cible.roles.cache.size - 1})`, value: roles,                             inline: false },
        { name: '🏅 Badges',         value: badgesList,                                                 inline: false },
      )
      .setFooter({ text: `Demandé par ${ctx.user.username}` });

    await ctx.reply({ embeds: [embed] });
  },
};