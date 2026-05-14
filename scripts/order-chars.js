const fs = require('fs');

// Lire le fichier
const data = JSON.parse(fs.readFileSync('data/characters.json', 'utf8'));

// Ordre des raretés
const rarityOrder = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
  mythic: 6
};

// Trier
data.sort((a, b) => {
  return rarityOrder[a.rarity] - rarityOrder[b.rarity];
});

// Sauvegarder
fs.writeFileSync(
  'data/characters.json',
  JSON.stringify(data, null, 2),
  'utf8'
);

console.log('Fichier trié.');