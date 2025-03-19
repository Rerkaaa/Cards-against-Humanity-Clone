const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const { startGame, submitCard, nextRound, shuffle } = require('./gameLogic');
const { addCard, getWhiteCards, getBlackCards, removeCard } = require('./db');
const fetch = require('node-fetch'); // This works with node-fetch@2
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Serve static files from the client folder
const staticPath = path.join(__dirname, '..', 'client');
console.log('Serving static files from:', staticPath);
app.use(express.static(staticPath));
app.use(express.json());

let games = {};

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('join-game', (gameId) => {
    socket.join(gameId);
    if (!games[gameId]) games[gameId] = { players: [], deck: [], state: 'lobby', submissions: [] };
    games[gameId].players.push(socket.id);
    io.to(gameId).emit('game-update', games[gameId]);
    startGame(gameId, io, games);
  });

  socket.on('submit-card', ({ gameId, card }) => {
    submitCard(gameId, socket.id, card, games, io);
  });

  socket.on('pick-winner', ({ gameId, winnerCard }) => {
    const game = games[gameId];
    const winner = game.submissions.find(sub => sub.card === winnerCard);
    if (winner) {
      game.scores = game.scores || {};
      game.scores[winner.playerId] = (game.scores[winner.playerId] || 0) + 1;
      io.to(gameId).emit('winner', { card: winnerCard, scores: game.scores });
      nextRound(gameId, io, games);
    }
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
  });
});

// Endpoint to upload a single card
app.post('/upload-card', async (req, res) => {
  const { type, text, pickCount } = req.body;
  try {
    addCard(type, text, pickCount);
    for (let gameId in games) {
      const game = games[gameId];
      if (type === 'white') game.deck = shuffle(await getWhiteCards());
      else if (type === 'black') game.blackDeck = shuffle(await getBlackCards());
    }
    res.send('Card added');
  } catch (error) {
    console.error('Error uploading card:', error);
    res.status(500).send('Failed to upload card');
  }
});

// Endpoint to import a deck from CrCast API
app.post('/import-deck', async (req, res) => {
  let { url } = req.body;
  const deckCode = url.split('/').pop();
  url = `https://api.crcast.cc/v1/cc/decks/${deckCode}/all?noTrackUsage=true`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const deck = await response.json();

    if (deck.error !== 0) throw new Error('API returned an error');

    if (deck.calls) {
      deck.calls.forEach(call => {
        const text = call.text.join(' ___ ').replace(/\n/g, '<br>');
        const pickCount = (call.text.filter(t => t === '').length) || 1;
        addCard('black', text, pickCount);
      });
    }

    if (deck.responses) {
      deck.responses.forEach(response => {
        const text = response.text.join('').replace(/\n/g, '<br>');
        addCard('white', text);
      });
    }

    for (let gameId in games) {
      const game = games[gameId];
      game.deck = shuffle(await getWhiteCards());
      game.blackDeck = shuffle(await getBlackCards());
    }

    res.send('Deck imported successfully');
  } catch (error) {
    console.error('Error importing deck:', error);
    res.status(500).send('Failed to import deck');
  }
});

// Endpoint to get the current deck
app.get('/get-deck', async (req, res) => {
  try {
    const white = await getWhiteCards();
    const black = await getBlackCards();
    res.json({ white, black });
  } catch (error) {
    console.error('Error fetching deck:', error);
    res.status(500).send('Failed to fetch deck');
  }
});

// Endpoint to remove a card
app.post('/remove-card', async (req, res) => {
  const { type, text } = req.body;
  try {
    removeCard(type, text);
    for (let gameId in games) {
      const game = games[gameId];
      if (type === 'white') game.deck = shuffle(await getWhiteCards());
      else if (type === 'black') game.blackDeck = shuffle(await getBlackCards());
    }
    res.send('Card removed');
  } catch (error) {
    console.error('Error removing card:', error);
    res.status(500).send('Failed to remove card');
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));