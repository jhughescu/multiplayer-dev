const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);


const players = new Map();
let master = null;
let int = null;
const waitForMaster = () => {
    if (master !== null) {
        clearInterval(masterTimer);
        clearInterval(int);
    }
};
int = setInterval(waitForMaster, 500);
var masterTimer = (function () {
    var P = ["\\", "|", "/", "-"];
    var x = 0;
    return setInterval(function () {
        process.stdout.write("\rwaiting for master " + P[x++]);
        x &= 3;
    }, 250);
})();
class Player {
    constructor(id) {
        this.id = id;
        this.socket = null;
        this.active = true;
    }
    setActive(boo) {
        this.active = boo;
    }
    handleDisconnect() {
        // Implement what you want to do when the player disconnects
        // For example, update any game state, notify other players, etc.
        console.log('Player', this.id, 'disconnected.');
    }
}
io.on('connection', (socket) => {
    socket.on('nowIAmTheMaster', () => {
        master = socket.id;
        io.emit('masterConnected', master);
        console.log('master');
    });
    socket.on('addNewPlayer', (id, callback) => {
        const player = new Player(id);
        console.log(player)
        //        players.set(id, socket);
        player.socket = socket;
        players.set(id, player);
        if (master === null) {
            //
        } else {
            io.emit('newPlayer', id);
        }
        if (callback) {
            if (typeof (callback) === 'function') {
                callback({
                    master: master
                })
            }
        }
    });
    const removal = () => {
        // Remove the player ID from the 'players' map upon disconnection
        for (const [playerId, playerSocket] of players.entries()) {
            if (playerSocket === socket) {
                players.delete(playerId);
                break;
            }
        }
        const playerIds = Array.from(players.keys());
        console.log('emitting getPlayers');
        io.emit('getPlayers');
        io.emit('updatePlayers', playerIds);
    }
    socket.on('remove', () => {
        removal();
    });
    socket.on('disconnect', () => {
        const player = players.get(socket.id);
        if (player) {
            player.handleDisconnect();
        }
    });
    socket.on('getPlayers', () => {
        // Send the list of player IDs to the requesting client
        const playerIds = Array.from(players.keys());
        console.log('emitting onGetPlayers');
        io.emit('onGetPlayers', playerIds);
    });
    socket.on('playerPing', (id) => {
        const targ = players.get(id).socket;
        if (targ) {
            targ.emit('ping');
        }
    });
    socket.on('playerReset', (id) => {
        const targ = players.get(id).socket;
        if (targ) {
            targ.emit('reset');
        }
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
