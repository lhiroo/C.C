const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('confess')
    .setDescription('Envoie une confession anonyme dans #confessions')
    .addStringOption(o => o.setName('confession').setDescription('Ta confession').setRequired(true)),

  name: 'confess',

  async execute(ctx) {
    await ctx.defer(true);

    const texte = ctx.isSlash
      ? ctx.source.options.getString('confession')
      : ctx.args.join(' ');

    if (!texte) return ctx.editReply('❌ Écris quelque chose.');

    const salon = ctx.guild.channels.cache.find(
      c => c.name.toLowerCase().includes('confession') && c.isTextBased()
    );

    if (!salon) {
      return ctx.editReply('❌ Aucun salon "confessions" trouvé sur ce serveur.');
    }

    const embed = new EmbedBuilder()
      .setTitle('🤫 Confession anonyme')
      .setDescription(texte)
      .setColor(0x2c3e50)
      .setTimestamp()
      .setFooter({ text: 'Confession anonyme' });

    await salon.send({ embeds: [embed] });

    // Une seule réponse — editReply car on a defer(true) au début
    await ctx.editReply(`✅ Ta confession a été envoyée dans <#${salon.id}>.`);

    // Prefix : supprimer le message original
    if (!ctx.isSlash) {
      await ctx.source.delete().catch(() => {});
    }
  },
};