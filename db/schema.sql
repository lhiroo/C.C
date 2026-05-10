CREATE TABLE IF NOT EXISTS gacha_users (
  id          TEXT PRIMARY KEY,
  guild_id    TEXT NOT NULL,
  username    TEXT,
  roll_count  INTEGER DEFAULT 0,
  roll_reset  INTEGER DEFAULT 0,
  last_claim  INTEGER DEFAULT 0,
  total_rolls  INTEGER DEFAULT 0,
  total_claims INTEGER DEFAULT 0,
  created_at  INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS characters (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  anime       TEXT NOT NULL,
  image_url   TEXT NOT NULL,
  rarity      TEXT NOT NULL,
  power       INTEGER NOT NULL,
  health      INTEGER NOT NULL,
  speed       INTEGER NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS user_cards (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      TEXT NOT NULL,
  guild_id     TEXT NOT NULL,
  character_id INTEGER NOT NULL,
  obtained_at  INTEGER DEFAULT (unixepoch()),
  is_favorite  INTEGER DEFAULT 0,
  FOREIGN KEY (character_id) REFERENCES characters(id)
);

CREATE TABLE IF NOT EXISTS active_rolls (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id     TEXT NOT NULL,
  channel_id   TEXT NOT NULL,
  message_id   TEXT,
  character_id INTEGER NOT NULL,
  rolled_by    TEXT NOT NULL,
  claimed_by TEXT DEFAULT NULL,
  claimed_at INTEGER DEFAULT NULL,
  expires_at   INTEGER NOT NULL,
  created_at   INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (character_id) REFERENCES characters(id)
);

CREATE TABLE IF NOT EXISTS trades (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id         TEXT NOT NULL,
  sender_id        TEXT NOT NULL,
  receiver_id      TEXT NOT NULL,
  sender_card_id   INTEGER NOT NULL,
  receiver_card_id INTEGER NOT NULL,
  status           TEXT DEFAULT 'pending',
  created_at       INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (sender_card_id)   REFERENCES user_cards(id),
  FOREIGN KEY (receiver_card_id) REFERENCES user_cards(id)
);

CREATE INDEX IF NOT EXISTS idx_user_cards_user  ON user_cards(user_id, guild_id);
CREATE INDEX IF NOT EXISTS idx_active_rolls_msg ON active_rolls(message_id);
CREATE INDEX IF NOT EXISTS idx_active_rolls_exp ON active_rolls(expires_at);