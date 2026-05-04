const { EmbedBuilder } = require('discord.js');
require('dotenv').config();

module.exports = {
  name: 'messageCreate',

  async execute(message, client) {

    if (message.author?.bot) return;

    if (message.content.toLowerCase() === "nul") {
      try {
        await message.react('💩');
      } catch (err) {
        console.log(err);
      }
    }

    if (message.channel.isDMBased()) {
        try {

            // Récupère ton compte
            const owner = await client.users.fetch(process.env.OWNER_ID);

            // Création embed
            const embed = new EmbedBuilder()
                .setTitle("📩 Nouveau DM reçu")
                .addFields(
                    {
                        name: "Utilisateur",
                        value: `${message.author.tag} (${message.author.id})`
                    },
                    {
                        name: "Message",
                        value: message.content || "Aucun texte"
                    }
                )
                .setThumbnail(message.author.displayAvatarURL())
                .setTimestamp()
                .setColor("Blue");

            // Envoie dans tes DMs
            await owner.send({ embeds: [embed] });
        } catch (err) {
            console.error("Erreur transfert DM :", err);
        }
    }
  }
}