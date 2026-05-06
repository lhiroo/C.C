require('dotenv').config();
const { REST, Routes } = require('discord.js');

const rest = new REST().setToken(process.env.TOKEN);

(async () => {
  // Supprimer toutes les commandes GLOBAL
  await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] });
  console.log('✅ Commandes globales supprimées');

  // Supprimer toutes les commandes GUILD (si tu as un GUILD_ID dans .env)
  if (process.env.GUILD_ID) {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: [] }
    );
    console.log('✅ Commandes guild supprimées');
  }
})();