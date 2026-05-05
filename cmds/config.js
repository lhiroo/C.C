const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
} = require('discord.js');
const { getConfig, setConfig, resetConfig, resetAll } = require('../systems/config');

const KEYS = {
  logs_channel:       { label: 'Salon de logs',            type: 'channel' },
  welcome_channel:    { label: 'Salon de bienvenue',       type: 'channel' },
  auto_role:          { label: 'Rôle automatique',         type: 'role'    },
  hub_channel:        { label: 'Hub vocal temporaire',     type: 'channel' },
  mute_role:          { label: 'Rôle mute',                type: 'role'    },
//ticket_category:    { label: 'Catégorie tickets',        type: 'channel' },
  confession_channel: { label: 'Salon confessions',        type: 'channel' },
  prefix:             { label: 'Préfixe commandes',        type: 'string'  },
  welcome_message:    { label: 'Message de bienvenue',     type: 'string'  },
//xp_enabled:         { label: 'Système XP',               type: 'boolean' },
//antispam_enabled:   { label: 'Anti-spam',                type: 'boolean' },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configurer le bot pour ce serveur')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    // ── Voir la config ───────────────────────────────────────────
    .addSubcommand(sub =>
      sub.setName('voir').setDescription('Afficher la configuration actuelle')
    )

    // ── Définir un salon ─────────────────────────────────────────
    .addSubcommand(sub =>
      sub.setName('salon')
         .setDescription('Configurer un salon')
         .addStringOption(o =>
           o.setName('type').setDescription('Quel salon configurer').setRequired(true)
            .addChoices(
              { name: '📋 Logs',                value: 'logs_channel'       },
              { name: '👋 Bienvenue',           value: 'welcome_channel'    },
              { name: '🔊 Hub vocal temporaire', value: 'hub_channel'       },
            //{ name: '🎫 Catégorie tickets',   value: 'ticket_category'    },
              { name: '🤫 Confessions',         value: 'confession_channel' },
            )
         )
         .addChannelOption(o =>
           o.setName('salon').setDescription('Le salon à définir').setRequired(true)
         )
    )

    // ── Définir un rôle ──────────────────────────────────────────
    .addSubcommand(sub =>
      sub.setName('role')
         .setDescription('Configurer un rôle')
         .addStringOption(o =>
           o.setName('type').setDescription('Quel rôle configurer').setRequired(true)
            .addChoices(
              { name: '🎭 Auto-role (nouveaux membres)', value: 'auto_role'  },
            //{ name: '🔇 Rôle mute',                   value: 'mute_role'  },
            )
         )
         .addRoleOption(o =>
           o.setName('role').setDescription('Le rôle à définir').setRequired(true)
         )
    )

    // ── Paramètres texte ─────────────────────────────────────────
    .addSubcommand(sub =>
      sub.setName('set')
         .setDescription('Modifier un paramètre texte')
         .addStringOption(o =>
           o.setName('parametre').setDescription('Paramètre à modifier').setRequired(true)
            .addChoices(
              { name: '⌨️ Préfixe',            value: 'prefix'          },
              { name: '👋 Message de bienvenue', value: 'welcome_message' },
            )
         )
         .addStringOption(o =>
           o.setName('valeur').setDescription('Nouvelle valeur').setRequired(true)
         )
    )

    // ── Activer/désactiver modules ───────────────────────────────
/*    .addSubcommand(sub =>
      sub.setName('module')
         .setDescription('Activer ou désactiver un module')
         .addStringOption(o =>
           o.setName('module').setDescription('Module').setRequired(true)
            .addChoices(
              { name: '✨ Système XP',  value: 'xp_enabled'       },
              { name: '🛡️ Anti-spam',  value: 'antispam_enabled'  },
            )
         )
         .addBooleanOption(o =>
           o.setName('actif').setDescription('Activer ou désactiver').setRequired(true)
         )
    )*/

    // ── Réinitialiser ────────────────────────────────────────────
    .addSubcommand(sub =>
      sub.setName('reset')
         .setDescription('Réinitialiser la configuration')
         .addStringOption(o =>
           o.setName('cle').setDescription('Clé à réinitialiser (laisser vide = tout reset)')
            .addChoices(
              ...Object.entries(KEYS).map(([k, v]) => ({ name: v.label, value: k }))
            )
         )
    ),

  name: 'config',

  async execute(ctx) {
    await ctx.defer(true);

    if (!ctx.isSlash) {
      return ctx.editReply("Cette action est réalisable uniquement via commandes / (ex: /config voir)")
    }

    const sub     = ctx.source.options.getSubcommand();
    const guildId = ctx.guild.id;
    const config  = getConfig(guildId);

    // ── /config voir ─────────────────────────────────────────────
    if (sub === 'voir') {
      const fmt = (val, type) => {
        if (val === null || val === undefined) return '`Non défini`';
        if (type === 'channel') return `<#${val}>`;
        if (type === 'role')    return `<@&${val}>`;
        if (type === 'boolean') return val ? '✅ Activé' : '❌ Désactivé';
        return `\`${val}\``;
      };

      const embed = new EmbedBuilder()
        .setTitle(`⚙️ Configuration de ${ctx.guild.name}`)
        .setColor(0x5865f2)
        .setTimestamp()
        .addFields(
          {
            name: '📢 Salons',
            value: [
              `📋 Logs : ${fmt(config.logs_channel, 'channel')}`,
              `👋 Bienvenue : ${fmt(config.welcome_channel, 'channel')}`,
              `🔊 Hub vocal : ${fmt(config.hub_channel, 'channel')}`,
            //`🎫 Tickets : ${fmt(config.ticket_category, 'channel')}`,
              `🤫 Confessions : ${fmt(config.confession_channel, 'channel')}`,
            ].join('\n'),
          },
          {
            name: '🎭 Rôles',
            value: [
              `🎭 Auto-role : ${fmt(config.auto_role, 'role')}`,
            //`🔇 Mute : ${fmt(config.mute_role, 'role')}`,
            ].join('\n'),
          },
          {
            name: '⚙️ Paramètres',
            value: [
              `⌨️ Préfixe : \`${config.prefix}\``,
            //`✨ XP : ${fmt(config.xp_enabled, 'boolean')}`,
            //`🛡️ Anti-spam : ${fmt(config.antispam_enabled, 'boolean')}`,
            ].join('\n'),
          },
          {
            name: '👋 Message de bienvenue',
            value: `\`${config.welcome_message}\`\n\n*Variables : \`{user}\` \`{server}\` \`{count}\`*`,
          },
        );

      return ctx.editReply({ embeds: [embed] });
    }

    // ── /config salon ─────────────────────────────────────────────
    if (sub === 'salon') {
      const type  = ctx.source.options.getString('type');
      const salon = ctx.source.options.getChannel('salon');

      setConfig(guildId, type, salon.id);

      return ctx.editReply(`✅ **${KEYS[type].label}** défini sur <#${salon.id}>.`);
    }

    // ── /config role ──────────────────────────────────────────────
    if (sub === 'role') {
      const type = ctx.source.options.getString('type');
      const role = ctx.source.options.getRole('role');

      setConfig(guildId, type, role.id);

      return ctx.editReply(`✅ **${KEYS[type].label}** défini sur <@&${role.id}>.`);
    }

    // ── /config set ───────────────────────────────────────────────
    if (sub === 'set') {
      const param  = ctx.source.options.getString('parametre');
      const valeur = ctx.source.options.getString('valeur');

      if (param === 'prefix' && valeur.length > 10) {
        return ctx.editReply('❌ Le préfixe ne peut pas dépasser 10 caractères.');
      }

      setConfig(guildId, param, valeur);

      return ctx.editReply(`✅ **${KEYS[param].label}** mis à jour : \`${valeur}\``);
    }

    // ── /config module ────────────────────────────────────────────
    if (sub === 'module') {
      const module = ctx.source.options.getString('module');
      const actif  = ctx.source.options.getBoolean('actif');

      setConfig(guildId, module, actif);

      return ctx.editReply(`${actif ? '✅' : '❌'} **${KEYS[module].label}** ${actif ? 'activé' : 'désactivé'}.`);
    }

    // ── /config reset ─────────────────────────────────────────────
    if (sub === 'reset') {
      const cle = ctx.source.options.getString('cle');

      if (cle) {
        resetConfig(guildId, cle);
        return ctx.editReply(`🔄 **${KEYS[cle].label}** réinitialisé.`);
      } else {
        resetAll(guildId);
        return ctx.editReply('🔄 Toute la configuration a été réinitialisée.');
      }
    }
  },
};