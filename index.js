const { Client, GatewayIntentBits, Collection, MessageFlags, EmbedBuilder, Partials } = require('discord.js');
const { buildCtx } = require('./utils/ctx');
const { getConfig } = require('./systems/config')
const { seedCharacters, cleanExpiredRolls } = require('./systems/gacha/roller');
const fs = require('fs');
require('dotenv').config();

// Empêcher les erreurs EPIPE de crash le process
process.on('uncaughtException', err => {
  if (err.code === 'EPIPE') return; // ignorer silencieusement
  console.error('[Uncaught Exception]', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Unhandled Rejection]', reason);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [
    Partials.Channel
  ]
});

// ─── Chargement des commandes ────────────────────────────────────
client.commands = new Collection();
const commandFiles = fs.readdirSync('./cmds').filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const cmd = require(`./cmds/${file}`);
  client.commands.set(cmd.name, cmd);
  if (cmd.aliases) {
    for (const alias of cmd.aliases) client.commands.set(alias, cmd);
  }
}

console.log(`[Commandes] ${client.commands.size} commande(s) chargée(s)`);

// ─── Chargement des events ───────────────────────────────────────
const eventFiles = fs.readdirSync('./events').filter(f => f.endsWith('.js'));
for (const file of eventFiles) {
  const event = require(`./events/${file}`);
  client.on(event.name, (...args) => event.execute(...args, client));
}

console.log(`[Events] ${eventFiles.length} event(s) chargé(s)`);

// ─── Helper : envoyer un log de commande ─────────────────────────
async function logCommande({ auteurId, salonId, contenu, logsChannel }) {

  if (!logsChannel) return; // pas de salon configuré → on ignore silencieusement

  const embed = new EmbedBuilder()
    .setTitle('⚙️ Commande exécutée')
    .addFields(
      { name: 'Auteur',  value: `<@${auteurId}>`,  inline: true },
      { name: 'Salon',   value: `<#${salonId}>`,   inline: true },
      { name: 'Contenu', value: contenu.slice(0, 1024) || '*Vide*' },
    )
    .setColor(0xe67e22)
    .setTimestamp();

  await logsChannel.send({ embeds: [embed] }).catch(() => {});
}

// ─── SLASH COMMANDS ──────────────────────────────────────────────
client.on('interactionCreate', async interaction => {

  // BOUTONS
  if (interaction.isButton()) {

      // --------------- Bouton claim gacha ---------------------
  if (interaction.customId.startsWith('claim_')) {
  try {
    const rollId = parseInt(interaction.customId.replace('claim_', ''));

    const { claim } = require('./systems/gacha/roller');
    const { EmbedBuilder } = require('discord.js');

    const result = claim(
      rollId,
      interaction.user.id,
      interaction.guild.id,
      interaction.user.username
    );

    if (!result.ok) {
      return interaction.reply({
        content: `❌ ${result.reason}`,
        flags: 64
      });
    }

    const { character, rarity } = result;

    const embed = new EmbedBuilder()
      .setTitle(`✅ ${character.name} ajouté à ta collection !`)
      .setDescription(`**${character.anime}** • ${rarity.emoji} ${rarity.label}`)
      .setThumbnail(character.image_url)
      .setColor(rarity.color);

    return interaction.reply({
      embeds: [embed],
      flags: 64
    });

  } catch (err) {
    console.error(err);

    if (!interaction.replied) {
      interaction.reply({
        content: '❌ Une erreur est survenue.',
        flags: 64
      }).catch(() => {});
    }
  }
}

  if (interaction.customId.startsWith('characters_')) {
    try {

      const characters = require('./cmds/characterlist');
        return characters.handleButton(interaction);

    } catch (err) {
      console.error(err);

      if (!interaction.replied) {
        interaction.reply({
          content: '❌ Erreur.',
          flags: 64
        }).catch(() => {});
      }
    }
  }
}
// ------------ Ignorer les interactions trop vieilles ------------------
  const age = Date.now() - interaction.createdTimestamp;
  if (age > 2500) {
    console.warn(`[Interaction ignorée] /${interaction.commandName} trop vieille (${age}ms)`);
    return;
  }

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  const config = interaction.guild ? getConfig(interaction.guild.id) : { prefix: 'cc ' };

  if (config.logs_channel) {
    const logsChannel = interaction.guild.channels.cache.get(config.logs_channel);

    await logCommande({
      auteurId: interaction.user.id,
      salonId:  interaction.channel.id,
      contenu:  `/${interaction.commandName}`,
      logsChannel: logsChannel,
    });
  }

  try {
    const ctx = buildCtx(interaction);
    await command.execute(ctx);
  } catch (err) {
    console.error(`[Erreur commande /${interaction.commandName}]`, err);

    const payload = { content: '❌ Une erreur est survenue.', flags: MessageFlags.Ephemeral };

    try {
      if (interaction.replied)       await interaction.followUp(payload);
      else if (interaction.deferred) await interaction.editReply(payload);
      else                           await interaction.reply(payload);
    } catch (e) {
      console.warn('[Handler] Réponse impossible :', e.message);
    }
  }
});

// ─── PREFIX COMMANDS ─────────────────────────────────────────────
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // ← Récupérer le prefix depuis la config du serveur
  const config = message.guild ? getConfig(message.guild.id) : { prefix: 'cc ' };
  const PREFIX = config.prefix;

  if (!message.content.toLowerCase().startsWith(PREFIX.toLowerCase())) return;

  const args        = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName);
  if (!command) return;

  if (config.logs_channel) {
    const logsChannel = message.guild.channels.cache.get(config.logs_channel);

  // Log de la commande prefix
    await logCommande({
      auteurId: message.author.id,
      salonId:  message.channel.id,
      contenu:  message.content.slice(0, 1024),
      logsChannel: logsChannel,
    })
  }

  try {
        const ctx = buildCtx(message, args);
        await command.execute(ctx);
    } catch (err) {
        console.error(`[Erreur commande cc ${commandName}]`, err);
        message.reply('❌ Une erreur est survenue.').catch(() => {});
    }
})

// ─── Prêt ────────────────────────────────────────────────────────
client.once('clientReady', () => {
  console.log(`✅ ${client.user.tag} est en ligne`);
  console.log(`📡 Connecté sur ${client.guilds.cache.size} serveur(s)`);

  // Seed les personnages en BDD
  seedCharacters();

  // Nettoyer les rolls expirés toutes les 5 minutes
  setInterval(cleanExpiredRolls, 5 * 60 * 1000);
});

client.login(process.env.TOKEN);