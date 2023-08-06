const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const gamedata = require('./data/gamedata.json');
console.log('gamedata');
console.log(gamedata);


const servants = new Map();
let master = null;
let int = null;
let isDev = true;
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
    socket.on('areWeDev', (cb) => {
        cb(isDev);
        return isDev;
    });
    socket.on('methodReady', (id) => {
        console.log(`methodReady: ${id}`)
    });
    socket.on('nowIAmTheMaster', () => {
        master = socket.id;
        io.emit('masterConnected', master);
    });
    socket.on('addNewServant', (id, callback) => {
        const player = new Player(id);
        player.socket = socket;
        servants.set(id, player);
        if (master !== null) {
            io.emit('newServant', id);
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
        let disconnectedPlayer = null;
        for (const [playerId, player] of servants.entries()) {
            if (player.socket.id === socket.id) {
                disconnectedPlayer = player;
                break;
            }
        }
        if (disconnectedPlayer) {
            servants.delete(disconnectedPlayer.id);
            onPlayersUpdate();
        }
    };
    const removalV1 = () => {
        // Remove the player ID from the 'players' map upon disconnection
        for (const [servantId, servantSocket] of servants.entries()) {
            if (servantSocket === socket) {
                servants.delete(servantId);
                break;
            }
        }
        const servantIds = Array.from(servants.keys());
        console.log('emitting getServants');
        io.emit('getServants');
        io.emit('updateServants', servantIds);
    };
    const onPlayersUpdate = () => {
        console.log('new onPLayersUpdate method');
        const servantIds = Array.from(servants.keys());
//        io.emit('onGetServantIDs', servantIds);
        const theServants = Array.from(servants.values());
        theServants.forEach((s, i) => {
//            console.log(i, s.socket.connected);
//            console.log(s);
            theServants[i] = {id: s.id, active: s.socket.connected};
        });
        io.emit('onGetServants', theServants);
    };
    socket.on('remove', () => {
        removal();
    });
    socket.on('disconnect', () => {
        // Find the player with the corresponding socket.id in the 'servants' map
        let disconnectedPlayer = null;
        for (const [playerId, player] of servants.entries()) {
            if (player.socket.id === socket.id) {
                disconnectedPlayer = player;
                break;
            }
        }
        if (disconnectedPlayer) {
            // Perform any actions required for the disconnected player
            disconnectedPlayer.handleDisconnect();
            // Remove the player from the 'servants' map
//            servants.delete(disconnectedPlayer.id);
            onPlayersUpdate();
        } else {
            console.log('no player found');
        }
    });
    socket.on('disconnectNOT', () => {
        const player = servants.get(socket.id);
//        console.log(`socket.id: ${socket.id}`);
//        console.log(servants);
        console.log(`disconnecting ${player}`)
        if (player) {
            player.handleDisconnect();
        }
    });
    socket.on('getServantIDs', () => {
        // Send the list of player IDs to the requesting client
        onPlayersUpdate();

    });
    socket.on('playerPing', (id) => {
        const targ = servants.get(id).socket;
        if (targ) {
            targ.emit('ping');
        }
    });
    socket.on('playerReset', (id) => {
        const targ = servants.get(id).socket;
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
