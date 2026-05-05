const {
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  NoSubscriberBehavior,
  StreamType,
  entersState,
} = require('@discordjs/voice');
const { ytdlpInfo, ytdlpSearch, createYtStream } = require('./ytdlp');
const { spawn } = require('child_process');
const path      = require('path');
const https     = require('https');

try { require('@discordjs/opus'); } catch {
  process.env.OPUS_ENGINE = 'opusscript';
}

// Chemin vers yt-dlp et ffmpeg
//const YTDLP_PATH  = path.join(process.cwd(), 'yt-dlp.exe');
//const FFMPEG_PATH = (() => { try { return require('ffmpeg-static'); } catch { return 'ffmpeg'; } })();

// ── Helpers URL ────────────────────────────────────────────────
function normalizeYoutubeUrl(input) {
  try {
    const url = new URL(input);
    if (url.hostname === 'youtu.be') {
      const id = url.pathname.slice(1).split('?')[0];
      return `https://www.youtube.com/watch?v=${id}`;
    }
    if (url.hostname.includes('youtube.com')) {
      const id = url.searchParams.get('v');
      if (id) return `https://www.youtube.com/watch?v=${id}`;
    }
    return input;
  } catch { return input; }
}

function isValidUrl(str) {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch { return false; }
}

function isYoutubeUrl(str) {
  try {
    const url = new URL(str);
    return url.hostname.includes('youtube.com') || url.hostname === 'youtu.be';
  } catch { return false; }
}

// ── yt-dlp : récupérer les infos d'une vidéo ──────────────────
/*function ytdlpInfo(url) {
  return new Promise((resolve, reject) => {
    const proc = spawn(YTDLP_PATH, [
      '--dump-json',
      '--no-playlist',
      '--quiet',
      url,
    ]);

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', d => stdout += d.toString());
    proc.stderr.on('data', d => stderr += d.toString());

    proc.on('close', code => {
      if (code !== 0) return reject(new Error(stderr.slice(-300) || 'yt-dlp info échoué'));
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error('Impossible de parser la réponse yt-dlp'));
      }
    });

    proc.on('error', err => reject(new Error(`yt-dlp introuvable : ${err.message}`)));
  });
}

// ── yt-dlp : recherche textuelle ──────────────────────────────
function ytdlpSearch(query) {
  return new Promise((resolve, reject) => {
    const proc = spawn(YTDLP_PATH, [
      '--dump-json',
      '--no-playlist',
      '--quiet',
      `ytsearch1:${query}`,
    ]);

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', d => stdout += d.toString());
    proc.stderr.on('data', d => stderr += d.toString());

    proc.on('close', code => {
      if (code !== 0) return reject(new Error(stderr.slice(-300) || 'Aucun résultat'));
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error('Impossible de parser la réponse yt-dlp'));
      }
    });

    proc.on('error', err => reject(new Error(`yt-dlp introuvable : ${err.message}`)));
  });
}

// ── Créer un stream audio via yt-dlp + ffmpeg ─────────────────
function createYtStream(url) {
  const ytdlp = spawn(YTDLP_PATH, [
    '--no-playlist',
    '--quiet',
    '--js-runtimes', 'nodejs',
    '-f', 'bestaudio/best',
    '-o', '-',
    url,
  ]);

  const ffmpeg = spawn(FFMPEG_PATH, [
    '-i', 'pipe:0',
    '-f', 's16le',
    '-ar', '48000',
    '-ac', '2',
    '-loglevel', 'error',
    'pipe:1',
  ]);

  // ← Crucial : catcher les erreurs sur tous les streams pour éviter le crash
  ytdlp.stdout.on('error', () => {});
  ytdlp.stdin.on('error',  () => {});
  ffmpeg.stdin.on('error', () => {});
  ffmpeg.stdout.on('error',() => {});

  ytdlp.stdout.pipe(ffmpeg.stdin);

  ytdlp.stderr.on('data',  d => { const m = d.toString().trim(); if (m && !m.startsWith('WARNING')) console.error('[yt-dlp]', m); });
  ffmpeg.stderr.on('data', d => { const m = d.toString().trim(); if (m) console.error('[ffmpeg]', m); });

  ytdlp.on('error',  () => {});
  ffmpeg.on('error', () => {});

  return ffmpeg.stdout;
}*/

// ── Embed Now Playing ──────────────────────────────────────────
function buildNowPlayingEmbed(track, queue) {
  const { EmbedBuilder } = require('discord.js');

  const elapsed   = queue.current?.startedAt
    ? Math.floor((Date.now() - queue.current.startedAt) / 1000) : 0;
  const total     = track.duration ?? 0;
  const progress  = total > 0 ? Math.round((elapsed / total) * 20) : 0;
  const barre     = '▓'.repeat(progress) + '░'.repeat(20 - progress);
  const fmt       = s => `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
  const loopEmoji = { off: '➡️', track: '🔂', queue: '🔁' }[queue.loop] ?? '➡️';

  return new EmbedBuilder()
    .setTitle('🎵 En cours de lecture')
    .setDescription(`**[${track.title}](${track.url})**`)
    .setThumbnail(track.thumbnail ?? null)
    .addFields(
      { name: 'Durée',       value: total > 0 ? `\`${fmt(elapsed)} / ${fmt(total)}\`` : '`Live`', inline: true },
      { name: 'Volume',      value: `\`${queue.volume}%\``, inline: true },
      { name: 'Loop',        value: loopEmoji,               inline: true },
      { name: 'Progression', value: `\`${barre}\``,          inline: false },
    )
    .setColor(0x1db954);
}

class MusicQueue {
  constructor() {
    this.queues = new Map();
  }

  async getOrCreate(guild, voiceChannel, textChannel) {
  if (this.queues.has(guild.id)) return this.queues.get(guild.id);

  // Vérifier les permissions avant de tenter la connexion
  const perms = voiceChannel.permissionsFor(guild.members.me);
  if (!perms?.has('Connect') || !perms?.has('Speak')) {
    throw new Error('Permission manquante : Connect ou Speak.');
  }

  const connection = joinVoiceChannel({
    channelId:      voiceChannel.id,
    guildId:        guild.id,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf:       true,
  });

  // Si déjà Ready, pas besoin d'attendre
  if (connection.state.status !== VoiceConnectionStatus.Ready) {
    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
    } catch {
      connection.destroy();
      throw new Error('Impossible de rejoindre le salon vocal.');
    }
  }

  const player = createAudioPlayer({
    behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
  });

  connection.subscribe(player);

  const queue = {
    guild, voiceChannel, textChannel,
    connection, player,
    tracks:  [],
    current: null,
    volume:  80,
    loop:    'off',
    paused:  false,
  };

  this.queues.set(guild.id, queue);

  player.on(AudioPlayerStatus.Idle, () => this._playNext(guild.id));
  player.on('error', err => {
    console.error('[Music] Erreur player:', err.message);
    this._playNext(guild.id);
  });

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
        entersState(connection, VoiceConnectionStatus.Connecting,  5_000),
      ]);
    } catch { this.destroy(guild.id); }
  });

  connection.on(VoiceConnectionStatus.Destroyed, () => this.destroy(guild.id));

  return queue;
}

  async _playNext(guildId) {
    const queue = this.queues.get(guildId);
    if (!queue) return;

    if (queue.loop === 'track' && queue.current) {
      return this._playTrack(guildId, queue.current);
    }
    if (queue.loop === 'queue' && queue.current) {
      queue.tracks.push(queue.current);
    }
    if (queue.tracks.length === 0) {
      queue.current = null;
      setTimeout(() => {
        const q = this.queues.get(guildId);
        if (q && !q.current && q.tracks.length === 0) {
          q.textChannel.send('👋 File vide — déconnexion.').catch(() => {});
          this.destroy(guildId);
        }
      }, 30_000);
      return;
    }
    await this._playTrack(guildId, queue.tracks.shift());
  }

  async _playTrack(guildId, track) {
    const queue = this.queues.get(guildId);
    if (!queue) return;

    if (!track?.url) {
      queue.textChannel.send(`❌ URL manquante pour **${track?.title}**.`).catch(() => {});
      return this._playNext(guildId);
    }

    try {
      console.log(`[Music] Streaming via yt-dlp : ${track.url}`);

      const audioStream = createYtStream(track.url);

      const resource = createAudioResource(audioStream, {
        inputType:    StreamType.Raw, // PCM brut depuis ffmpeg
        inlineVolume: true,
      });

      resource.volume?.setVolume(queue.volume / 100);

      queue.current           = track;
      queue.current.resource  = resource;
      queue.current.startedAt = Date.now();

      queue.player.play(resource);

      queue.textChannel.send({
        embeds: [buildNowPlayingEmbed(track, queue)],
      }).catch(() => {});

    } catch (err) {
      console.error('[Music] Erreur lecture:', err.message);
      queue.textChannel.send(`❌ Impossible de lire **${track.title}**.`).catch(() => {});
      this._playNext(guildId);
    }
  }

  async add(guild, voiceChannel, textChannel, query) {
    const queue = await this.getOrCreate(guild, voiceChannel, textChannel);

    let track;
    try {
      const cleanQuery = isValidUrl(query) ? normalizeYoutubeUrl(query) : query;
      const queryIsUrl = isYoutubeUrl(cleanQuery);

      console.log(`[Music] ${queryIsUrl ? 'URL' : 'Recherche'} : ${cleanQuery}`);

      const info = queryIsUrl
        ? await ytdlpInfo(cleanQuery)
        : await ytdlpSearch(cleanQuery);

      track = {
        title:       info.title       ?? 'Titre inconnu',
        url:         info.webpage_url ?? info.url ?? cleanQuery,
        duration:    info.duration    ?? 0,
        thumbnail:   info.thumbnail   ?? null,
        requestedBy: null,
      };

    } catch (err) {
      throw new Error(`Recherche échouée : ${err.message}`);
    }

    console.log(`[Music] Track résolu → "${track.title}" | ${track.url}`);

    if (!queue.current) {
      await this._playTrack(guild.id, track);
    } else {
      queue.tracks.push(track);
    }

    return { track, position: queue.tracks.length };
  }

  skip(guildId) {
    const q = this.queues.get(guildId);
    if (!q) return false;
    q.player.stop(true);
    return true;
  }

  pause(guildId) {
    const q = this.queues.get(guildId);
    if (!q || q.paused) return false;
    q.player.pause();
    q.paused = true;
    return true;
  }

  resume(guildId) {
    const q = this.queues.get(guildId);
    if (!q || !q.paused) return false;
    q.player.unpause();
    q.paused = false;
    return true;
  }

  setVolume(guildId, vol) {
    const q = this.queues.get(guildId);
    if (!q) return false;
    q.volume = vol;
    q.current?.resource?.volume?.setVolume(vol / 100);
    return true;
  }

  setLoop(guildId, mode) {
    const q = this.queues.get(guildId);
    if (!q) return false;
    q.loop = mode;
    return true;
  }

  shuffle(guildId) {
    const q = this.queues.get(guildId);
    if (!q || q.tracks.length < 2) return false;
    for (let i = q.tracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [q.tracks[i], q.tracks[j]] = [q.tracks[j], q.tracks[i]];
    }
    return true;
  }

  destroy(guildId) {
    const q = this.queues.get(guildId);
    if (!q) return;
    try { q.player.stop(true); } catch {}
    try { q.connection.destroy(); } catch {}
    this.queues.delete(guildId);
  }

  get(guildId) { return this.queues.get(guildId); }
  has(guildId) { return this.queues.has(guildId); }
}

module.exports = new MusicQueue();
module.exports.buildNowPlayingEmbed = buildNowPlayingEmbed;