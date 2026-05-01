const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const REPONSES = [
  { text: 'Absolument.',             color: 0x2ecc71 },
  { text: 'C\'est certain.',         color: 0x2ecc71 },
  { text: 'Sans aucun doute.',       color: 0x2ecc71 },
  { text: 'Oui, définitivement.',    color: 0x2ecc71 },
  { text: 'Tu peux compter dessus.', color: 0x2ecc71 },
  { text: 'Réessaie plus tard...',   color: 0xf39c12 },
  { text: 'Je ne peux pas te dire.', color: 0xf39c12 },
  { text: 'Concentre-toi et redemande.', color: 0xf39c12 },
  { text: 'Non.',                    color: 0xe74c3c },
  { text: 'Mes sources disent non.', color: 0xe74c3c },
  { text: 'Très peu probable.',      color: 0xe74c3c },
  { text: 'Oublie ça.',              color: 0xe74c3c },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Pose une question à la boule magique')
    .addStringOption(o => o.setName('question').setDescription('Ta question').setRequired(true)),

  name: '8ball',
  usage: 'cc 8ball Est-ce que je vais réussir ?',

  async execute(ctx) {
    const question = ctx.isSlash
      ? ctx.source.options.getString('question')
      : ctx.args.join(' ');

    if (!question) return ctx.reply('❌ Pose une question !');

    const rep = REPONSES[Math.floor(Math.random() * REPONSES.length)];

    const embed = new EmbedBuilder()
      .setTitle('🎱 Boule magique')
      .addFields(
        { name: '❓ Question', value: question },
        { name: '🔮 Réponse',  value: rep.text  },
      )
      .setColor(rep.color);

    await ctx.reply({ embeds: [embed] });
  },
};