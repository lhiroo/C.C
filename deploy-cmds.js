require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const fs = require('fs');

const rest = new REST().setToken(process.env.TOKEN);

// Charger tous les fichiers de commandes automatiquement
const commands = [];
const commandFiles = fs.readdirSync('./cmds').filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const cmd = require(`./cmds/${file}`);
  commands.push(cmd.data.toJSON()); // .toJSON() = format attendu par l'API
}

(async () => {
  console.log(`Déploiement de ${commands.length} commande(s)...`);

  await rest.put(
    // GUILD = instantané (pour dev), APPLICATION = global (jusqu'à 1h de délai)
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commands }
  );

  console.log('✅ Commandes déployées !');
})();