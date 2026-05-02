// Map qui stocke les salons temporaires créés
// clé : ID du salon créé — valeur : ID du propriétaire
const tempChannels = new Map();

// ⚠️ Remplace cette valeur par l'ID de ton salon "hub"
// C'est le salon vocal que les gens rejoignent pour déclencher la création
const HUB_CHANNEL_ID = process.env.HUB_CHANNEL_ID;

module.exports = {
  name: 'voiceStateUpdate',

  async execute(oldState, newState) {
    const member = newState.member ?? oldState.member;
    const guild  = newState.guild  ?? oldState.guild;

    // ── Quelqu'un REJOINT le hub → créer un salon temporaire ────
    if (newState.channelId === HUB_CHANNEL_ID) {
      // Récupérer la catégorie du hub pour y créer le salon
      const hubChannel = guild.channels.cache.get(HUB_CHANNEL_ID);
      const categorie  = hubChannel?.parent;

      const newChannel = await guild.channels.create({
        name:   `🔊 ${member.displayName}`,
        type:   2, // 2 = GuildVoice
        parent: categorie?.id ?? null,

        // Copier les permissions de la catégorie parente
        permissionOverwrites: categorie?.permissionOverwrites.cache.map(p => ({
          id:    p.id,
          allow: p.allow,
          deny:  p.deny,
        })) ?? [],
      });

      // Positionner juste après le hub
      await newChannel.setPosition(hubChannel.position + 1).catch(() => {});

      // Déplacer le membre dans le nouveau salon
      await member.voice.setChannel(newChannel);

      // Mémoriser le salon temporaire
      tempChannels.set(newChannel.id, member.id);

      console.log(`[TempVC] Salon créé : ${newChannel.name} pour ${member.user.tag}`);
    }

    // ── Quelqu'un QUITTE un salon temporaire → supprimer si vide ─
    if (oldState.channelId && tempChannels.has(oldState.channelId)) {
      const channel = guild.channels.cache.get(oldState.channelId);

      // Si le salon n'existe plus ou est vide → supprimer
      if (!channel || channel.members.size === 0) {
        await channel?.delete().catch(() => {});
        tempChannels.delete(oldState.channelId);
        console.log(`[TempVC] Salon supprimé : ${oldState.channelId}`);
      }
    }
  },
};