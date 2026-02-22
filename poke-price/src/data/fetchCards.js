const fs = require('fs');
const path = require('path');
const axios = require('axios');

const DATA_DIR = path.join(__dirname, 'cards/en');
const BACKEND_URL = 'http://localhost:3000/cards';

let allCards = [];
const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'));

files.forEach((file) => {
  const json = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8'));
  allCards = allCards.concat(json);
});

console.log(`Loaded ${allCards.length} cards from ${files.length} files.`);

let currentIndex = 0;

const sources = [
  'eBay',
  'Cardmarket',
  'TCGplayer',
  'Amazon',
  'AliExpress',
  'Temu',
];

setInterval(async () => {
  if (currentIndex >= allCards.length) {
    console.log('All cards sent. Looping back to start.');
    currentIndex = 0;
  }

  const card = allCards[currentIndex];

  const source = sources[Math.floor(Math.random() * sources.length)];

  const price = parseFloat((10 + Math.random() * 90).toFixed(2));

  const payload = {
    ...card,
    source,
    price,
  };

  try {
    await axios.post(BACKEND_URL, payload);
    console.log(`Sent card: ${card.name} (#${currentIndex + 1})`);
  } catch (err) {
    console.error(`Error sending card ${card.name}:`, err.message);
  }

  currentIndex++;
}, 3000);
