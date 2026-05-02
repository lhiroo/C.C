const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'guildMemberRemove',

  async execute(member, client) {
    const logsChannel = member.guild.channels.cache.get(process.env.LOGS_CHANNEL_ID);
    if (!logsChannel) return;

    const roles = member.roles.cache
      .filter(r => r.id !== member.guild.id)
      .map(r => `<@&${r.id}>`)
      .join(' ') || 'Aucun';

    const embed = new EmbedBuilder()
      .setTitle('📤 Membre parti')
      .setDescription(`**${member.user.tag}** a quitté le serveur`)
      .addFields(
        { name: 'Avait rejoint', value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Inconnu', inline: true },
        { name: 'Rôles', value: roles, inline: false },
      )
      .setColor(0xe74c3c)
      .setTimestamp();

    await logsChannel.send({ embeds: [embed] }).catch(() => {});
  },
};