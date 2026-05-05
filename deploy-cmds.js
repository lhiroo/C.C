require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');

const rest = new REST().setToken(process.env.TOKEN);

const commands = [];
const commandFiles = fs.readdirSync('./cmds').filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const cmd = require(`./cmds/${file}`);
  if (cmd.data) commands.push(cmd.data.toJSON());
}

(async () => {
  console.log(`Déploiement de ${commands.length} commande(s)...`);

  await rest.put(
    Routes.applicationCommands(process.env.CLIENT_ID), // ← global, tous les serveurs
    { body: commands }
  );

  console.log('✅ Commandes déployées !');
})();