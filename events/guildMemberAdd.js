const { Events } = require('discord.js');
const { getConfig } = require('../systems/config');

module.exports = {
  name: Events.GuildMemberAdd,

  async execute(member, client) {
    const config = getConfig(member.guild.id);

    // Auto-role
    if (config.auto_role) {
      const role = member.guild.roles.cache.get(config.auto_role);
      if (role) await member.roles.add(role).catch(() => {});
    }

    // Message de bienvenue
    if (config.welcome_channel) {
      const channel = member.guild.channels.cache.get(config.welcome_channel);
      if (channel) {
        const msg = config.welcome_message
          .replace('{user}',   `<@${member.id}>`)
          .replace('{server}', member.guild.name)
          .replace('{count}',  member.guild.memberCount);

        const embed = new EmbedBuilder()
          .setDescription(msg)
          .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
          .setColor(0x2ecc71)
          .setTimestamp();

        await channel.send({ embeds: [embed] }).catch(() => {});
      }
    }
  }
}