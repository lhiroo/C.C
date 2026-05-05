const fs   = require('fs');
const path = require('path');

const DIR  = path.join(process.cwd(), 'data');
const FILE = path.join(DIR, 'config.json');

// Valeurs par défaut pour chaque serveur
const DEFAULTS = {
  logs_channel:      null,
  welcome_channel:   null,
  auto_role:         null,
  hub_channel:       null,
//mute_role:         null,
//ticket_category:   null,
  confession_channel: null,
  prefix:            'cc ',
//xp_enabled:        true,
  antispam_enabled:  false,
  welcome_message:   'Bienvenue {user} sur **{server}** ! Tu es le **{count}ème** membre.',
};

// Charger le fichier
function load() {
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, '{}');
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf-8'));
  } catch {
    return {};
  }
}

// Sauvegarder
function save(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

// Récupérer la config d'un serveur
function getConfig(guildId) {
  const all = load();
  return { ...DEFAULTS, ...(all[guildId] ?? {}) };
}

// Modifier une clé
function setConfig(guildId, key, value) {
  const all = load();
  if (!all[guildId]) all[guildId] = {};
  all[guildId][key] = value;
  save(all);
}

// Réinitialiser une clé
function resetConfig(guildId, key) {
  const all = load();
  if (all[guildId]) delete all[guildId][key];
  save(all);
}

// Réinitialiser toute la config d'un serveur
function resetAll(guildId) {
  const all = load();
  delete all[guildId];
  save(all);
}

module.exports = { getConfig, setConfig, resetConfig, resetAll, DEFAULTS };