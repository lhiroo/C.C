const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { roll, ROLL_LIMIT } = require('../systems/gacha/roller');
const { RARITIES }         = require('../systems/gacha/drops');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Roll un personnage aléatoire'),

  name: 'roll',

  async execute(ctx) {
    await ctx.defer();

    const result = roll(
      ctx.user.id,
      ctx.guild.id,
      ctx.channel.id,
      ctx.user.username,
    );

    if (!result.ok) return ctx.editReply(`❌ ${result.reason}`);

    const { character, rarity, rollId, rollsLeft, expiresAt } = result;

    const embed = new EmbedBuilder()
      .setTitle(`${rarity.emoji} ${character.name}`)
      .setDescription(`**${character.anime}**\n*${character.description ?? ''}*`)
      .setImage(character.image_url)
      .setColor(rarity.color)
      .addFields(
        { name: '⚔️ Puissance', value: `${character.power}`,  inline: true },
        //{ name: '❤️ Santé',     value: `${character.health}`, inline: true },
        //{ name: '💨 Vitesse',   value: `${character.speed}`,  inline: true },
        { name: '✨ Rareté',    value: rarity.label,           inline: true },
        { name: '🎲 Rolls',     value: `${rollsLeft}/${ROLL_LIMIT}`, inline: true },
      )
      .setFooter({ text: `Expire dans 60s • ID: ${rollId}` })
      .setTimestamp();

    // Bouton claim
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`claim_${rollId}`)
        .setLabel('✋ Claim')
        .setStyle(ButtonStyle.Success),
    );

    const msg = await ctx.editReply({ embeds: [embed], components: [row] });

    // Désactiver le bouton après 60s
    setTimeout(async () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`claim_${rollId}`)
          .setLabel('⏰ Expiré')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
      );
      await msg.edit({ components: [disabledRow] }).catch(() => {});
    }, 60_000);
  },
};