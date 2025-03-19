const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(':memory:'); // Or 'cards.db'

db.serialize(() => {
  db.run('CREATE TABLE IF NOT EXISTS black_cards (text TEXT, pick_count INTEGER)');
  db.run('CREATE TABLE IF NOT EXISTS white_cards (text TEXT)');
  db.run('INSERT INTO white_cards (text) VALUES ("A big hug."), ("Pineapple pizza."), ("Chaos.")');
  db.run('INSERT INTO black_cards (text, pick_count) VALUES ("What’s the best gift?", 1), ("Why did I fail?", 1)');
});

function getWhiteCards() {
  return new Promise((resolve) => {
    db.all('SELECT text FROM white_cards', (err, rows) => {
      if (err) console.error('Error fetching white cards:', err);
      resolve(rows.map(row => row.text));
    });
  });
}

function getBlackCards() {
  return new Promise((resolve) => {
    db.all('SELECT text, pick_count FROM black_cards', (err, rows) => {
      if (err) console.error('Error fetching black cards:', err);
      resolve(rows.map(row => row));
    });
  });
}

function addCard(type, text, pickCount) {
  if (type === 'black') {
    db.run('INSERT INTO black_cards (text, pick_count) VALUES (?, ?)', [text, pickCount || 1], (err) => {
      if (err) console.error('Error adding black card:', err);
    });
  } else {
    db.run('INSERT INTO white_cards (text) VALUES (?)', [text], (err) => {
      if (err) console.error('Error adding white card:', err);
    });
  }
}

function removeCard(type, text) {
  if (type === 'black') {
    db.run('DELETE FROM black_cards WHERE text = ?', [text], (err) => {
      if (err) console.error('Error removing black card:', err);
    });
  } else {
    db.run('DELETE FROM white_cards WHERE text = ?', [text], (err) => {
      if (err) console.error('Error removing white card:', err);
    });
  }
}

module.exports = { getWhiteCards, getBlackCards, addCard, removeCard };