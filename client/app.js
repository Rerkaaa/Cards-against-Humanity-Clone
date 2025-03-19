const socket = io('http://localhost:3000', {
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

let playerRole = '';
let currentGameId = '';
let selectedCards = [];
let requiredCards = 1;
let isCzar = false;

document.getElementById('join-btn').addEventListener('click', () => {
  const gameId = document.getElementById('game-id').value;
  currentGameId = gameId;
  socket.emit('join-game', gameId);
});

socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});

socket.on('role-assigned', (role) => {
  playerRole = role;
  document.getElementById('status').innerText = `Players: 0, State: lobby | Role: ${role}`;
});

socket.on('game-update', (game) => {
  document.getElementById('status').innerText = `Players: ${game.players.length}, State: ${game.state} | Role: ${playerRole} | Czar: ${game.czar || 'None'}`;
  const playerList = document.getElementById('player-list');
  isCzar = game.czar === socket.id; // Check if this player is the Czar
  playerList.innerHTML = '<h3>Players:</h3>' + game.players.map(player => `
    <div>
      Player ID: ${player.id} (${player.role})${player.id === game.czar ? ' (Czar)' : ''}
      ${playerRole === 'Host' && player.id !== socket.id ? `<button onclick="kickPlayer('${player.id}')">Kick</button>` : ''}
    </div>
  `).join('');
  if (playerRole === 'Host') {
    playerList.innerHTML += `<button onclick="endGame()">End Game</button>`;
  }

  const uploadSection = document.querySelector('.upload-section');
  const deckManagementSection = document.querySelector('.deck-management');
  if (game.state === 'playing') {
    uploadSection.style.display = 'none';
    deckManagementSection.style.display = 'none';
  } else {
    uploadSection.style.display = 'block';
    deckManagementSection.style.display = 'block';
  }
  updateHandDisplay(); // Update hand display to reflect Czar status
});

socket.on('new-round', (blackCard) => {
  console.log('New round started, black card:', blackCard);
  const blackCardDiv = document.getElementById('black-card');
  if (blackCardDiv) {
    blackCardDiv.innerHTML = `<h2>${blackCard.text}</h2>`;
  }
  document.getElementById('submissions').innerHTML = '';
  document.getElementById('winner').innerHTML = '';
  requiredCards = blackCard.pick_count || 1;
  selectedCards = [];
  updateHandDisplay();
});

socket.on('update-hand', (cards) => {
  console.log('Hand updated:', cards);
  const handDiv = document.getElementById('hand');
  if (handDiv) {
    handDiv.innerHTML = cards.map(card => 
      `<div class="card${isCzar ? ' disabled' : ''}" ${isCzar ? '' : `onclick="selectCard('${card.replace(/'/g, "\\'")}')"`}>${card}</div>`
    ).join('');
  }
});

function selectCard(card) {
  if (isCzar) {
    alert('You are the Czar! You cannot submit cards.');
    return;
  }
  if (selectedCards.length >= requiredCards) {
    alert(`You can only select ${requiredCards} card(s) for this black card!`);
    return;
  }
  if (selectedCards.includes(card)) {
    alert('You have already selected this card!');
    return;
  }
  selectedCards.push(card);
  updateHandDisplay();
  if (selectedCards.length === requiredCards) {
    submitCards();
  }
}

function updateHandDisplay() {
  const handDiv = document.getElementById('hand');
  const cards = Array.from(handDiv.children).map(child => child.textContent);
  handDiv.innerHTML = cards.map(card => {
    const isSelected = selectedCards.includes(card);
    return `<div class="card${isCzar ? ' disabled' : ''}${isSelected ? ' selected' : ''}" ${isCzar ? '' : `onclick="selectCard('${card.replace(/'/g, "\\'")}')"`}>${card}</div>`;
  }).join('');
  document.getElementById('submissions').innerHTML = `Selected: ${selectedCards.join(', ')} (Need ${requiredCards} card(s))`;
}

socket.on('card-submitted', ({ playerId, card }) => {
  const submissionsDiv = document.getElementById('submissions');
  submissionsDiv.innerHTML += `<div class="card">${card}</div>`;
});

socket.on('round-end', (submissions) => {
  const submissionsDiv = document.getElementById('submissions');
  submissionsDiv.innerHTML = 'Waiting for Czar...<br>' + 
    submissions.map(sub => `<div class="submission">${sub.cards.join(' + ')}</div>`).join('');
});

socket.on('judge-time', (submissions) => {
  const submissionsDiv = document.getElementById('submissions');
  submissionsDiv.innerHTML = 'Pick a winner:<br>' + 
    submissions.map(sub => `<div class="submission" onclick="pickWinner('${sub.cards.join('|').replace(/'/g, "\\'")}')">${sub.cards.join(' + ')}</div>`).join('');
});

socket.on('winner', ({ card, scores }) => {
  document.getElementById('winner').innerHTML = `Winner: ${card}<br>Scores: ${Object.values(scores).join(', ')}`;
});

socket.on('kicked', () => {
  alert('You have been kicked from the game!');
  window.location.reload();
});

socket.on('game-ended', () => {
  alert('The game has ended!');
  window.location.reload();
  document.querySelector('.upload-section').style.display = 'block';
  document.querySelector('.deck-management').style.display = 'block';
});

socket.on('submission-error', (message) => {
  alert(message);
});

function selectCard(card) {
  // Prevent selecting more cards than allowed
  if (selectedCards.length >= requiredCards) {
    alert(`You can only select ${requiredCards} card(s) for this black card!`);
    return;
  }
  // Prevent selecting the same card multiple times
  if (selectedCards.includes(card)) {
    alert('You have already selected this card!');
    return;
  }
  selectedCards.push(card);
  updateHandDisplay();
  if (selectedCards.length === requiredCards) {
    submitCards();
  }
}

function submitCards() {
  const gameId = document.getElementById('game-id').value;
  selectedCards.forEach(card => {
    socket.emit('submit-card', { gameId, card });
  });
  selectedCards = [];
  updateHandDisplay();
}

function updateHandDisplay() {
  const handDiv = document.getElementById('hand');
  const cards = Array.from(handDiv.children).map(child => child.textContent);
  handDiv.innerHTML = cards.map(card => {
    const isSelected = selectedCards.includes(card);
    return `<div class="card ${isSelected ? 'selected' : ''}" onclick="selectCard('${card.replace(/'/g, "\\'")}')">${card}</div>`;
  }).join('');
  document.getElementById('submissions').innerHTML = `Selected: ${selectedCards.join(', ')} (Need ${requiredCards} card(s))`;
}

function pickWinner(cards) {
  const gameId = document.getElementById('game-id').value;
  socket.emit('pick-winner', { gameId, card: cards });
}

function kickPlayer(playerId) {
  socket.emit('kick-player', { gameId: currentGameId, playerId });
}

function endGame() {
  socket.emit('end-game', { gameId: currentGameId });
}

function uploadCard() {
  const text = document.getElementById('card-text').value;
  const type = document.getElementById('card-type').value;
  const pickCount = document.getElementById('pick-count').value;
  fetch('/upload-card', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, text, pickCount: type === 'black' ? pickCount : undefined })
  }).then(() => {
    alert('Card uploaded!');
    loadDeckList();
  });
}

function importDeck() {
  console.log('Import button clicked');
  const url = document.getElementById('deck-url').value;
  console.log('Sending URL:', url);
  fetch('/import-deck', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  }).then(response => {
    console.log('Response status:', response.status);
    if (!response.ok) throw new Error('Import failed');
    return response.text();
  }).then(message => {
    console.log('Response message:', message);
    alert(message);
    loadDeckList();
  }).catch(error => {
    console.error('Import error:', error);
    alert('Failed to import deck');
  });
}

function loadDeckList() {
  fetch('/get-deck', { method: 'GET' })
    .then(response => response.json())
    .then(deck => {
      const deckList = document.getElementById('deck-list');
      deckList.innerHTML = '<h4>Current Deck:</h4>' +
        '<h5>White Cards:</h5>' + deck.white.map(card => 
          `<div>${card} <button onclick="removeCard('white', '${card.replace(/'/g, "\\'")}')">Remove</button></div>`).join('') +
        '<h5>Black Cards:</h5>' + deck.black.map(card => 
          `<div>${card.text} (Pick ${card.pick_count}) <button onclick="removeCard('black', '${card.text.replace(/'/g, "\\'")}')">Remove</button></div>`).join('');
    })
    .catch(error => console.error('Error loading deck list:', error));
}

function removeCard(type, text) {
  fetch('/remove-card', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, text })
  }).then(() => {
    alert('Card removed!');
    loadDeckList();
  });
}