const YTDlpWrap = require('yt-dlp-wrap').default;
const path      = require('path');
const fs        = require('fs');

const BINARY_DIR  = path.join(process.cwd(), 'bin');
const BINARY_PATH = path.join(BINARY_DIR, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');

let ytdlp = null;

async function getYtDlp() {
  if (ytdlp) return ytdlp;

  // Créer le dossier bin si nécessaire
  if (!fs.existsSync(BINARY_DIR)) fs.mkdirSync(BINARY_DIR, { recursive: true });

  // Télécharger le binaire si absent
  if (!fs.existsSync(BINARY_PATH)) {
    console.log('[yt-dlp] Téléchargement du binaire...');
    await YTDlpWrap.downloadFromGithub(BINARY_PATH);
    // Rendre exécutable sur Linux
    if (process.platform !== 'win32') {
      fs.chmodSync(BINARY_PATH, '755');
    }
    console.log('[yt-dlp] Binaire téléchargé ✓');
  }

  ytdlp = new YTDlpWrap(BINARY_PATH);
  return ytdlp;
}

// Info sur une vidéo
async function ytdlpInfo(url) {
  const yt = await getYtDlp();
  const json = await yt.execPromise([
    url,
    '--dump-json',
    '--no-playlist',
    '--quiet',
    '--js-runtimes', 'node',
    '--cookies', 'cookies.txt',
  ]);
  return JSON.parse(json);
}

// Recherche textuelle
async function ytdlpSearch(query) {
  const yt = await getYtDlp();
  const json = await yt.execPromise([
    `ytsearch1:${query}`,
    '--dump-json',
    '--no-playlist',
    '--quiet',
    '--js-runtimes', 'node',
    '--cookies', 'cookies.txt',
  ]);
  return JSON.parse(json);
}

// Stream audio
function createYtStream(url) {
  const { spawn } = require('child_process');

  let ffmpegBin;
  try { ffmpegBin = require('ffmpeg-static'); } catch { ffmpegBin = 'ffmpeg'; }

  const ytdlpProc = spawn(BINARY_PATH, [
    '--no-playlist',
    '--quiet',
    '--js-runtimes', 'node',
    '--cookies', 'cookies.txt',
    '-f', 'bestaudio/best',
    '-o', '-',
    url,
  ]);

  const ffmpeg = spawn(ffmpegBin, [
    '-i',        'pipe:0',
    '-f',        's16le',
    '-ar',       '48000',
    '-ac',       '2',
    '-loglevel', 'error',
    'pipe:1',
  ]);

  ytdlpProc.stdout.on('error', () => {});
  ytdlpProc.stdin.on('error',  () => {});
  ffmpeg.stdin.on('error',     () => {});
  ffmpeg.stdout.on('error',    () => {});

  ytdlpProc.stdout.pipe(ffmpeg.stdin);

  ytdlpProc.stderr.on('data', d => {
    const m = d.toString().trim();
    if (m && !m.startsWith('WARNING')) console.error('[yt-dlp]', m);
  });
  ffmpeg.stderr.on('data', d => {
    const m = d.toString().trim();
    if (m) console.error('[ffmpeg]', m);
  });

  ytdlpProc.on('error', () => {});
  ffmpeg.on('error',    () => {});

  return ffmpeg.stdout;
}

module.exports = { ytdlpInfo, ytdlpSearch, createYtStream, getYtDlp };