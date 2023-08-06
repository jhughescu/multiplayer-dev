const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);



const MAX_PLAYERS = 2;

let players = [];
let secretNumber;

function generateSecretNumber() {
  return Math.floor(Math.random() * 100) + 1;
}

io.on('connection', (socket) => {
  console.log('New player connected:', socket.id);

  if (players.length >= MAX_PLAYERS) {
    socket.emit('gameFull');
    socket.disconnect(true);
    return;
  }

  players.push(socket.id);

  if (players.length === 2) {
    secretNumber = generateSecretNumber();
    console.log('Secret Number:', secretNumber);
  }

  socket.on('guess', (number) => {
    if (parseInt(number) === secretNumber) {
      io.emit('win', socket.id);
      console.log('Player', socket.id, 'guessed the correct number!');
    } else {
      socket.emit('guessResult', { message: 'Incorrect guess. Try again!' });
    }
  });

  socket.on('disconnect', () => {
    players = players.filter((player) => player !== socket.id);
    console.log('Player disconnected:', socket.id);
  });
});

// Serve the static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// All other routes will serve the 'index.html' file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const port = 3000;
server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
