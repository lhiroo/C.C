const { MessageFlags } = require('discord.js');

function buildCtx(source, args = []) {
  const isSlash = source.isChatInputCommand?.();

  return {
    args,
    isSlash,
    source,

    async reply(content) {
      if (isSlash) return source.reply(typeof content === 'string' ? { content } : content);
      return source.reply(content);
    },

    async replyEphemeral(content) {
      if (isSlash) {
        return source.reply({
          content,
          flags: MessageFlags.Ephemeral, // ← fix du warning
        });
      }
      return source.author.send(content).catch(() => {});
    },

    async defer(ephemeral = false) {
      if (isSlash) {
        return source.deferReply(
          ephemeral ? { flags: MessageFlags.Ephemeral } : {}
        );
      }
      this._thinkingMsg = await source.reply('⏳ Traitement en cours...').catch(() => null);
    },

    async editReply(content) {
      if (isSlash) return source.editReply(typeof content === 'string' ? { content } : content);
      if (this._thinkingMsg) return this._thinkingMsg.edit(content);
    },

    get guild()   { return source.guild; },
    get channel() { return source.channel; },
    get user()    { return isSlash ? source.user : source.author; },
  };
}

module.exports = { buildCtx };