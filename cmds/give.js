const { SlashCommandBuilder } = require('discord.js');
const { claim } = require('../systems/gacha/roller')
require('dotenv').config();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('give')
        .setDescription('no description')
        .addUserOption(o => o.setName('cible').setDescription('Membre à give'))
        .addIntegerOption(o => o.setName('id').setDescription('Id de la carte').setRequired(true)),

    name: "give",

    async execute(ctx) {
        if (ctx.user.id !== process.env.OWNER_ID) {
            const confirmation = await ctx.reply( "❌ Tu ne peux pas executer cette commande.");

            setTimeout(() => {
                confirmation.delete().catch(() => {});
            }, 4000);

            return;
        }

        const guildId = ctx.guild?.id;
        const cible  = ctx.isSlash ? (ctx.source.options.getUser('cible') ?? ctx.user )   : (ctx.source.mentions.users.first() ?? ctx.user);
        const rawId = ctx.isSlash
    ? ctx.source.options.getInteger('id')
    : ctx.args.find(a => /^\d+$/.test(a));

const rollId = parseInt(rawId, 10);

if (!Number.isFinite(rollId)) {
    return ctx.reply("❌ ID invalide (attendu un nombre).");
}

        /*const result = await claim (
            rollId,
            cible.id,
            guildId,
            cible.username
        );

        if (!result?.ok) {
            const confirmation = await ctx.reply(`❌ ${result.reason ?? 'Une erreur est survenue.'}`);

            setTimeout(() => {
                confirmation.delete().catch(() => {});
            }, 4000);

            return;
        } 

        const { character } = result;

        return ctx.reply(`${character.name} given to ${cible.username}`);*/
        return
    }
}