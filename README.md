# Cards Against Humanity Clone

A web-based clone of *Cards Against Humanity*, built with Node.js, Express, Socket.IO, and SQLite. Players can join game sessions, submit cards, and manage decks dynamically.

## User Guide/Setup

### Prerequisites
- **Node.js**: Ensure you have Node.js installed (version 14 or higher recommended). Download it from [nodejs.org](https://nodejs.org/).
- **Git**: Optional, for cloning the repository.
- A modern web browser (e.g., Chrome, Firefox).

### Setup Instructions
1. **Clone or Download the Repository**:
   - If using Git:

      `git clone https://github.com/Rerkaaa/Cards-against-Humanity-Clone.git`

      `cd Cards-Against-Humanity`

- Otherwise, download the ZIP file from the repository and extract it to `<PATH>`

2. **Install Dependencies**:
- Open a terminal in the project folder (`<PATH>`)
- Run:

    `npm install`

- This installs required packages: `express`, `socket.io`, `sqlite3`, `node-fetch@2`.

3. **Run the Server**:
- From the project folder:

    `node server/server.js`
  
- You should see:

    `Serving static files from: <PATH>\client` 

    `Server running on port 3000`

4. **Access the Game**:
- Open a browser and go to `http://localhost:3000`.
- Enter a Game ID to join or start a game session.
- Use multiple browser tabs to simulate multiple players.

### How to Play
- **Join a Game**: Enter a Game ID and click "Join Game". The first player to join becomes the host.
- **Play Cards**: When it’s your turn, select a white card from your hand to submit. If you’re the Czar, pick the best submission.
- **Manage Decks**: Use the "Upload Card" and "Deck Management" sections to add or import cards (hidden during gameplay).

## To-Do List

- [ ] Fix card selection issues
- [ ] Fix Czar role issues
- [ ] Let players and host join first and then start game with a Start button
- [ ] If the Czar leaves the game a new random Czar is appointed from the players in the session
- [ ] Fix card display 
- [ ] Show already started games in a list or drop down or dashboard style showing available and ongoing games
- [ ] Have players put username and password when they open the site/ usernames have to be unique 
- [ ] Display player connections and disconnects with their usernames 
- [ ] Store user info in database


## Contributing
Feel free to fork this repository, make changes, and submit pull requests. For major changes, please open an issue first to discuss what you would like to change.

## License
[MIT License](LICENSE)