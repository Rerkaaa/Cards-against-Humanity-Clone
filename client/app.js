const socket = io('http://localhost:3000');

document.getElementById('join-btn').addEventListener('click', () => {
  const gameId = document.getElementById('game-id').value;
  socket.emit('join-game', gameId);
});

socket.on('game-update', (game) => {
  document.getElementById('status').innerText = `Players: ${game.players.length}, State: ${game.state}`;
});

socket.on('new-round', (blackCard) => {
  document.getElementById('black-card').innerHTML = `<h2>${blackCard.text}</h2>`;
  document.getElementById('submissions').innerHTML = '';
  document.getElementById('winner').innerHTML = '';
});

socket.on('update-hand', (cards) => {
  const handDiv = document.getElementById('hand');
  handDiv.innerHTML = cards.map(card => `<div class="card" onclick="submitCard('${card}')">${card}</div>`).join('');
});

socket.on('card-submitted', ({ playerId, card }) => {
  const submissionsDiv = document.getElementById('submissions');
  submissionsDiv.innerHTML += `<div class="card">${card}</div>`;
});

socket.on('round-end', (submissions) => {
  document.getElementById('submissions').innerHTML = 'Waiting for Czar...<br>' + 
    submissions.map(sub => `<div class="card">${sub.card}</div>`).join('');
});

socket.on('judge-time', (submissions) => {
  const submissionsDiv = document.getElementById('submissions');
  submissionsDiv.innerHTML = 'Pick a winner:<br>' + 
    submissions.map(sub => `<div class="card" onclick="pickWinner('${sub.card}')">${sub.card}</div>`).join('');
});

socket.on('winner', ({ card, scores }) => {
  document.getElementById('winner').innerHTML = `Winner: ${card}<br>Scores: ${Object.values(scores).join(', ')}`;
});

function submitCard(card) {
  const gameId = document.getElementById('game-id').value;
  socket.emit('submit-card', { gameId, card });
}

function pickWinner(card) {
  const gameId = document.getElementById('game-id').value;
  socket.emit('pick-winner', { gameId, card });
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