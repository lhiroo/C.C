const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ship')
    .setDescription('Calcule la compatibilité entre deux personnes 💘')
    .addUserOption(o => o.setName('personne1').setDescription('Première personne').setRequired(true))
    .addUserOption(o => o.setName('personne2').setDescription('Deuxième personne').setRequired(true)),

  name: 'ship',
  aliases: ['lovelc'],
  usage: 'cc ship @user1 @user2',

  async execute(ctx) {
    const p1 = ctx.isSlash ? ctx.source.options.getUser('personne1') : ctx.source.mentions.users.first();
    const p2 = ctx.isSlash ? ctx.source.options.getUser('personne2') : ctx.source.mentions.users.at(1);

    if (!p1 || !p2) return ctx.reply('❌ Mentionne deux utilisateurs.');

    // Score déterministe basé sur les IDs (toujours le même résultat pour le même couple)
    const seed  = (BigInt(p1.id) + BigInt(p2.id)) % 101n;
    const score = Number(seed);

    const barre = Math.round(score / 10);
    const jauge = '❤️'.repeat(barre) + '🖤'.repeat(10 - barre);

    const niveau =
      score >= 90 ? '💍 Âmes sœurs !'   :
      score >= 70 ? '💕 Très compatible' :
      score >= 50 ? '😊 Pas mal...'      :
      score >= 30 ? '😬 Bof bof'         :
                    '💔 Catastrophe';

    // Nom fusionné
    const shipName = p1.username.slice(0, Math.ceil(p1.username.length / 2))
                   + p2.username.slice(Math.floor(p2.username.length / 2));

    const embed = new EmbedBuilder()
      .setTitle(`💘 Ship : ${shipName}`)
      .setDescription(`${p1} ❤️ ${p2}\n\n${jauge}\n\n**${score}% — ${niveau}**`)
      .setColor(score > 50 ? 0xff6b6b : 0x95a5a6);

    await ctx.reply({ embeds: [embed] });
  },
};