const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const EMOJIS = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Crée un sondage')
    .addStringOption(o => o.setName('question').setDescription('Question').setRequired(true))
    .addStringOption(o => o.setName('choix1').setDescription('Choix 1').setRequired(true))
    .addStringOption(o => o.setName('choix2').setDescription('Choix 2').setRequired(true))
    .addStringOption(o => o.setName('choix3').setDescription('Choix 3'))
    .addStringOption(o => o.setName('choix4').setDescription('Choix 4'))
    .addStringOption(o => o.setName('choix5').setDescription('Choix 5')),

  name: 'poll',
  aliases: ["survey"],
  usage: 'cc poll "Question" "Choix 1" "Choix 2"',

  async execute(ctx) {
    let question, choix;

    if (ctx.isSlash) {
      question = ctx.source.options.getString('question');
      choix = [1,2,3,4,5]
        .map(n => ctx.source.options.getString(`choix${n}`))
        .filter(Boolean);
    } else {
      // Parser les guillemets : !poll "Question ?" "Oui" "Non"
      const matches = ctx.source.content.match(/"([^"]+)"/g);
      if (!matches || matches.length < 3) {
        return ctx.reply('❌ Format : `!poll "Question" "Choix 1" "Choix 2"`');
      }
      [question, ...choix] = matches.map(m => m.replace(/"/g, ''));
    }

    const description = choix
      .map((c, i) => `${EMOJIS[i]} ${c}`)
      .join('\n\n');

    const embed = new EmbedBuilder()
      .setTitle(`📊 ${question}`)
      .setDescription(description)
      .setColor(0x5865f2)
      .setFooter({ text: `Sondage créé par ${ctx.user.username}` })
      .setTimestamp();

    const msg = await ctx.channel.send({ embeds: [embed] });

    // Ajouter les réactions automatiquement
    for (let i = 0; i < choix.length; i++) {
      await msg.react(EMOJIS[i]);
    }

    // Accuser réception en éphémère si slash
    if (ctx.isSlash) await ctx.replyEphemeral('✅ Sondage créé !');
    else await ctx.source.delete().catch(() => {});
  },
};