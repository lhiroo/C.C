const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { getConfig } = require('../systems/config');

module.exports = {
  name: 'messageDelete',

  async execute(message, client) {
    if (message.author?.bot) return;
    if (!message.content) return;

    const config      = getConfig(message.guild?.id);
    const logsChannel = message.guild?.channels.cache.get(config.logs_channel);
    if (!logsChannel) return;

    const embed = new EmbedBuilder()
      .setTitle('🗑️ Message supprimé')
      .addFields(
        { name: 'Auteur',  value: `<@${message.author?.id}>`, inline: true },
        { name: 'Salon',   value: `<#${message.channel.id}>`, inline: true },
        { name: 'Contenu', value: message.content.slice(0, 1024) || '*Vide*' },
      )
      .setColor(0xe67e22)
      .setTimestamp();

    await logsChannel.send({ embeds: [embed] }).catch(() => {});
  },
};