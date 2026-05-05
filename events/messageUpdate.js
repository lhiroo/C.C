const { EmbedBuilder } = require('discord.js');
const { getConfig } = require('../systems/config');

module.exports = {
  name: 'messageUpdate',

  async execute(oldMessage, newMessage, client) {
    if (oldMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;
    const config      = getConfig(oldMessage.guild?.id);
    const logsChannel = oldMessage.guild?.channels.cache.get(config.logs_channel);
    if (!logsChannel) return;

    const embed = new EmbedBuilder()
      .setTitle('✏️ Message modifié')
      .setURL(newMessage.url)
      .addFields(
        { name: 'Auteur',  value: `<@${oldMessage.author?.id}>`, inline: true },
        { name: 'Salon',   value: `<#${oldMessage.channel.id}>`, inline: true },
        { name: 'Avant',   value: (oldMessage.content || '*Vide*').slice(0, 512) },
        { name: 'Après',   value: (newMessage.content || '*Vide*').slice(0, 512) },
      )
      .setColor(0x3498db)
      .setTimestamp();

    await logsChannel.send({ embeds: [embed] }).catch(() => {});
  },
};