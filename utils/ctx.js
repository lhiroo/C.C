const { MessageFlags } = require('discord.js');

function buildCtx(source, args = []) {
  const isSlash = source.isChatInputCommand?.();

  const ctxObj = {
    args,
    isSlash,
    source,
    _thinkingMsg: null,

    async reply(content) {
      if (isSlash) return source.reply(typeof content === 'string' ? { content } : content);
      return source.reply(content);
    },

    async replyEphemeral(content) {
      if (isSlash) {
        return source.reply({ content, flags: MessageFlags.Ephemeral });
      }
      return source.author.send(content).catch(() => {});
    },

    async defer(ephemeral = false) {
      if (isSlash) {
        if (source.deferred || source.replied) return;
        return source.deferReply(ephemeral ? { flags: MessageFlags.Ephemeral } : {});
      }
      ctxObj._thinkingMsg = await source.reply('⏳ Traitement en cours...').catch(() => null);
    },

    async editReply(content) {
      if (isSlash) {
        return source.editReply(typeof content === 'string' ? { content } : content);
      }
      if (ctxObj._thinkingMsg) {
        const payload = typeof content === 'string'
          ? { content }
          : { content: '', ...content };
        return ctxObj._thinkingMsg.edit(payload);
      }
    },

    get guild()   { return source.guild; },
    get channel() { return source.channel; },
    get user()    { return isSlash ? source.user : source.author; },
  };

  return ctxObj;
}

module.exports = { buildCtx };