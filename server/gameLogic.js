const { getWhiteCards, getBlackCards } = require('./db'); // Import DB functions

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function startGame(gameId, io, games) {
  const game = games[gameId];
  if (game.players.length >= 3 && game.state === 'lobby') {
    game.state = 'playing';
    game.deck = shuffle(await getWhiteCards()); // Load and shuffle white cards
    game.blackDeck = shuffle(await getBlackCards()); // Load and shuffle black cards
    game.czarIndex = 0;
    game.usedCards = []; // Track used cards (optional)

    game.players.forEach(player => {
      const hand = game.deck.splice(0, 10);
      game.usedCards.push(...hand); // Mark as used (optional)
      io.to(player).emit('update-hand', hand);
    });
    io.to(gameId).emit('new-round', game.blackDeck.pop());
  }
}

function submitCard(gameId, playerId, card, games, io) {
  const game = games[gameId];
  if (!game.submissions) game.submissions = [];
  const isCzar = playerId === game.players[game.czarIndex];
  if (!isCzar) { // Czar doesn’t submit
    game.submissions.push({ playerId, card });
    game.usedCards = game.usedCards || []; // Initialize if not present
    game.usedCards.push(card); // Track used card (optional)
    io.to(gameId).emit('card-submitted', { playerId: 'anonymous', card });
  }
  if (game.submissions.length === game.players.length - 1) { // All non-Czar players submitted
    io.to(game.players[game.czarIndex]).emit('judge-time', game.submissions);
    io.to(gameId).emit('round-end', game.submissions); // Show all players
  }
}

function nextRound(gameId, io, games) {
  const game = games[gameId];
  game.submissions = [];
  game.czarIndex = (game.czarIndex + 1) % game.players.length; // Rotate Czar
  game.players.forEach(player => {
    // Simplified: Deal from deck without usedCards check for now
    const handSize = game.deck.length >= 10 ? 10 : game.deck.length;
    const hand = game.deck.splice(0, handSize);
    io.to(player).emit('update-hand', hand);
  });
  io.to(gameId).emit('new-round', game.blackDeck.pop());
}

module.exports = { startGame, submitCard, nextRound, shuffle };