const { Client, GatewayIntentBits, Collection, MessageFlags, EmbedBuilder, Partials } = require('discord.js');
const { buildCtx } = require('./utils/ctx');
const fs = require('fs');
require('dotenv').config();

const PREFIX = 'cc ';

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
async function logCommande({ auteurId, salonId, contenu }) {
  const logsChannel = client.channels.cache.get(process.env.LOGS_CHANNEL_ID);
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
  if (!interaction.isChatInputCommand()) return;

  const logsChannel = client.channels.cache.get(process.env.LOGS_CHANNEL_ID);

  // Ignorer les interactions trop vieilles
  const age = Date.now() - interaction.createdTimestamp;
  if (age > 2500) {
    console.warn(`[Interaction ignorée] /${interaction.commandName} trop vieille (${age}ms)`);
    return;
  }

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  // Log de la commande slash
  await logCommande({
    auteurId: interaction.user.id,
    salonId:  interaction.channel.id,
    contenu:  `/${interaction.commandName}`,
  });

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
  if (!message.content.toLowerCase().startsWith(PREFIX)) return;

  const args        = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName);
  if (!command) return;

  // Log de la commande prefix
  await logCommande({
    auteurId: message.author.id,
    salonId:  message.channel.id,
    contenu:  message.content.slice(0, 1024),
  });

  try {
    const ctx = buildCtx(message, args);
    await command.execute(ctx);
  } catch (err) {
    console.error(`[Erreur commande cc ${commandName}]`, err);
    message.reply('❌ Une erreur est survenue.').catch(() => {});
  }
});

// ─── Prêt ────────────────────────────────────────────────────────
client.once('clientReady', () => {
  console.log(`✅ ${client.user.tag} est en ligne`);
  console.log(`📡 Connecté sur ${client.guilds.cache.size} serveur(s)`);
});

client.login(process.env.TOKEN);