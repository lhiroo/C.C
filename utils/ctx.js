// utils/ctx.js
function buildCtx(source, args = []) {
  const isSlash = source.isChatInputCommand?.();

  return {
    args,         // arguments parsés (prefix) ou null (slash — utiliser getOption)
    isSlash,
    source,       // l'objet brut si tu en as besoin

    // Répondre
    async reply(content) {
      if (isSlash) return source.reply(content);
      return source.reply(content);  // même API ici, mais pas toujours
    },

    // Répondre en éphémère (invisible pour les autres)
    async replyEphemeral(content) {
      if (isSlash) return source.reply({ content, ephemeral: true });
      // Prefix : pas d'éphémère possible, on envoie en DM
      return source.author.send(content);
    },

    // Différer (tâches longues)
    async defer() {
      if (isSlash) return source.deferReply();
      // Prefix : envoyer un message temporaire
      this._thinkingMsg = await source.reply('⏳ Traitement...');
    },

    // Éditer après defer
    async editReply(content) {
      if (isSlash) return source.editReply(content);
      return this._thinkingMsg?.edit(content);
    },

    // Récupérer le guild, channel, user
    get guild()   { return source.guild; },
    get channel() { return source.channel; },
    get user()    { return isSlash ? source.user : source.author; },
  };
}

module.exports = { buildCtx };