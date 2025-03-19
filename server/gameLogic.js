const { getWhiteCards, getBlackCards } = require('./db');

async function startGame(gameId, io, games) {
  const game = games[gameId];
  if (game.state !== 'lobby') return;
  game.state = 'playing';
  game.deck = await getWhiteCards();
  game.blackDeck = await getBlackCards();
  // Randomly select the initial Czar
  game.czarIndex = Math.floor(Math.random() * game.players.length);
  game.submissions = {};
  dealCards(game, io);
  nextRound(gameId, io, games);
}

function dealCards(game, io) {
  game.players.forEach(player => {
    const hand = [];
    while (hand.length < 7 && game.deck.length > 0) {
      hand.push(game.deck.pop());
    }
    io.to(player.id).emit('update-hand', hand);
  });
}

function submitCard(gameId, playerId, card, games, io) {
  const game = games[gameId];
  if (!game || game.state !== 'playing') return;
  const player = game.players.find(p => p.id === playerId);
  if (!player || game.czarIndex === game.players.indexOf(player)) return;

  if (!game.submissions[playerId]) {
    game.submissions[playerId] = [];
  }

  const requiredCards = game.currentBlackCard ? game.currentBlackCard.pick_count : 1;
  if (game.submissions[playerId].length >= requiredCards) {
    io.to(playerId).emit('submission-error', `You can only submit ${requiredCards} card(s) for this black card!`);
    return;
  }

  game.submissions[playerId].push(card);
  io.to(gameId).emit('card-submitted', { playerId, card });

  const allSubmitted = Object.keys(game.submissions).length === game.players.length - 1 &&
    Object.values(game.submissions).every(cards => cards.length >= requiredCards);

  if (allSubmitted) {
    const submissions = Object.entries(game.submissions).map(([playerId, cards]) => ({
      playerId,
      cards
    }));
    io.to(gameId).emit('round-end', submissions);
    io.to(game.players[game.czarIndex].id).emit('judge-time', submissions);
  }
}

function nextRound(gameId, io, games) {
  const game = games[gameId];
  if (!game || game.blackDeck.length === 0) return;
  game.czarIndex = (game.czarIndex + 1) % game.players.length;
  game.submissions = {};
  const blackCard = game.blackDeck.pop();
  game.currentBlackCard = blackCard; // Store the current black card
  io.to(gameId).emit('new-round', blackCard); // Emit to all players in the room
  dealCards(game, io);
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

module.exports = { startGame, submitCard, nextRound, shuffle };