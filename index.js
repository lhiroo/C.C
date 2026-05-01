const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { buildCtx } = require('./utils/ctx');
const fs = require('fs');
require('dotenv').config();

const PREFIX = 'cc ';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // obligatoire pour les prefix commands
  ],
});

// Charger toutes les commandes
client.commands = new Collection();
const commandFiles = fs.readdirSync('./cmds').filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const cmd = require(`./cmds/${file}`);
  client.commands.set(cmd.name, cmd);         // indexé par nom principal

  // Indexer les aliases aussi
  if (cmd.aliases) {
    for (const alias of cmd.aliases) {
      client.commands.set(alias, cmd);
    }
  }
}

// ─── SLASH COMMANDS ────────────────────────────────────────────
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    const ctx = buildCtx(interaction);
    await command.execute(ctx);
  } catch (err) {
    console.error(err);
    const payload = { content: '❌ Erreur.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  }
});

// ─── PREFIX COMMANDS ────────────────────────────────────────────
client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (!message.content.toLowerCase().startsWith(PREFIX.toLowerCase())) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName);
  if (!command) return;

  try {
    const ctx = buildCtx(message, args);
    await command.execute(ctx);
  } catch (err) {
    console.error(err);
    message.reply('❌ Erreur.');
  }
});

// ───────────────────────────────────────────────────────────────
client.once('ready', () => console.log(`✅ ${client.user.tag} en ligne`));
client.login(process.env.TOKEN);