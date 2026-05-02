const { Client, GatewayIntentBits, Collection, MessageFlags } = require('discord.js');
const { buildCtx } = require('./utils/ctx');
const fs = require('fs');
require('dotenv').config();

const PREFIX = 'cc ';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
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

// ─── SLASH COMMANDS ──────────────────────────────────────────────
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  // Ignorer les interactions trop vieilles (bot redémarré, etc.)
  const age = Date.now() - interaction.createdTimestamp;
  if (age > 2500) {
    console.warn(`[Interaction ignorée] /${interaction.commandName} trop vieille (${age}ms)`);
    return;
  }

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    const ctx = buildCtx(interaction);
    await command.execute(ctx);
  } catch (err) {
    console.error(`[Erreur commande /${interaction.commandName}]`, err);

    const payload = {
      content: '❌ Une erreur est survenue.',
      flags: MessageFlags.Ephemeral,
    };

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