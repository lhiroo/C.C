const RARITIES = {
  common:    { label: 'Common',    emoji: '⚪', color: 0x95a5a6, weight: 5000, powerRange: [500,   1499]  },
  uncommon:  { label: 'Uncommon',  emoji: '🟢', color: 0x2ecc71, weight: 3000, powerRange: [1500,  2999]  },
  rare:      { label: 'Rare',      emoji: '🔵', color: 0x3498db, weight: 1400, powerRange: [3000,  4999]  },
  epic:      { label: 'Epic',      emoji: '🟣', color: 0x9b59b6, weight: 450,  powerRange: [5000,  6999]  },
  legendary: { label: 'Legendary', emoji: '🟡', color: 0xf39c12, weight: 120,  powerRange: [7000,  8999]  },
  mythic:    { label: 'Mythic',    emoji: '🔴', color: 0xe74c3c, weight: 30,   powerRange: [9000,  10000] },
};

const TOTAL_WEIGHT = Object.values(RARITIES).reduce((sum, r) => sum + r.weight, 0);

// Tirer une rareté aléatoire selon les poids
function rollRarity() {
  let rand = Math.random() * TOTAL_WEIGHT;
  for (const [key, rarity] of Object.entries(RARITIES)) {
    rand -= rarity.weight;
    if (rand <= 0) return key;
  }
  return 'common';
}

// Calculer le taux de drop en %
function dropRate(rarityKey) {
  return ((RARITIES[rarityKey].weight / TOTAL_WEIGHT) * 100).toFixed(2);
}

module.exports = { RARITIES, rollRarity, dropRate, TOTAL_WEIGHT };