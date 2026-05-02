const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nuke')
    .setDescription('Recrée le salon (supprime tous les messages)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  name: 'nuke',

  async execute(ctx) {
    const channel = ctx.channel;

    // Cloner le salon (garde les permissions, le nom, la position, etc.)
    const newChannel = await channel.clone({ reason: `Nuke par ${ctx.user.tag}` });
    await newChannel.setPosition(channel.position);

    // Supprimer l'ancien
    await channel.delete();

    // Message de confirmation dans le nouveau salon
    await newChannel.send('💥');
  },
};