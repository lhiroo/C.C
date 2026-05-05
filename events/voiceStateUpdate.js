const { ChannelType } = require('discord.js');
const { getConfig } = require('../systems/config');
const tempChannels = new Map();


module.exports = {
  name: 'voiceStateUpdate',

  async execute(oldState, newState) {
    const member = newState.member ?? oldState.member;
    const guild  = newState.guild  ?? oldState.guild;
    const config = getConfig(guild.id);

    // ← Utiliser le hub depuis la config au lieu de .env
    const HUB_CHANNEL_ID = config.hub_channel;
    if (!HUB_CHANNEL_ID) return;

    // ── Rejoint le hub → créer un salon ──────────────────────────
    if (newState.channelId === HUB_CHANNEL_ID) {

      // Sécurité : si le membre est déjà dans un temp à lui, ne pas en créer un 2e
      const dejaProprietaire = [...tempChannels.entries()]
        .find(([, ownerId]) => ownerId === member.id);

      if (dejaProprietaire) {
        const existing = guild.channels.cache.get(dejaProprietaire[0]);
        if (existing) {
          await member.voice.setChannel(existing).catch(() => {});
          return;
        }
      }

      const hubChannel = guild.channels.cache.get(HUB_CHANNEL_ID);

      try {
        const newChannel = await guild.channels.create({
          name:   `🔊 ${member.displayName}`,
          type:   ChannelType.GuildVoice, // ← plus lisible que "2"
          parent: hubChannel?.parentId ?? null,
          permissionOverwrites: hubChannel?.parent?.permissionOverwrites.cache.toJSON() ?? [],
        });

        await newChannel.setPosition(hubChannel.rawPosition + 1).catch(() => {});

        // Déplacer le membre (peut échouer si l'utilisateur s'est déconnecté entre temps)
        await member.voice.setChannel(newChannel).catch(async () => {
          // Si le déplacement échoue, supprimer le salon vide
          await newChannel.delete().catch(() => {});
          return;
        });

        tempChannels.set(newChannel.id, member.id);
        console.log(`[TempVC] ✅ Créé : "${newChannel.name}" pour ${member.user.tag}`);

      } catch (err) {
        console.error('[TempVC] Erreur lors de la création du salon :', err.message);
      }
    }

    // ── Quitte un salon temp → supprimer si vide ─────────────────
    if (oldState.channelId && tempChannels.has(oldState.channelId)) {
      const channel = guild.channels.cache.get(oldState.channelId);

      // Salon introuvable (déjà supprimé) → nettoyer la Map
      if (!channel) {
        tempChannels.delete(oldState.channelId);
        return;
      }

      // Salon vide → supprimer
      if (channel.members.size === 0) {
        try {
          await channel.delete();
          tempChannels.delete(oldState.channelId);
          console.log(`[TempVC] 🗑️ Supprimé : "${channel.name}"`);
        } catch (err) {
          console.error('[TempVC] Erreur lors de la suppression :', err.message);
          tempChannels.delete(oldState.channelId); // nettoyer quand même
        }
      }
    }
  },
};