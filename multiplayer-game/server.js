const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const fs = require('fs');
const path = require('path');
const csvWriter = require('csv-writer').createObjectCsvWriter;

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const gamedata = require('./data/gamedata.json');
//console.log('gamedata');
//console.log(gamedata);
const gameDataOut = 'gamedata.csv';
const data = [
    { name: 'Alice', score: 100 },
    { name: 'Bob', score: 75 },
    { name: 'Carol', score: 90 },
];

const players = new Map();
let master = null;
let int = null;
let isDev = true;

//routes:
app.get('/download-csv', (req, res) => {
    console.log('go down the route');
    const csvWriterInstance = csvWriter({
        path: gameDataOut,
        header: [
            { id: 'name', title: 'Name' },
            { id: 'score', title: 'Score' },
        ],
    });

    csvWriterInstance.writeRecords(data)
        .then(() => {
            res.download(gameDataOut, (err) => {
                if (err) {
                    console.error('Error sending CSV:', err);
                }
                // Delete the CSV file after sending
                fs.unlinkSync(gameDataOut);
            });
        })
        .catch((error) => {
            console.error('Error writing CSV:', error);
            res.status(500).send('Internal Server Error - route not found');
        });
});
// end routes

const waitForMaster = () => {
    if (master !== null) {
        clearInterval(masterTimer);
        clearInterval(int);
    }
};
const allocateTeams = () => {

};
class Session {
    constructor(id) {
        this.id = id;
//        this.data = Object.assign({}, gamedata);
    }
}
class Stakeholder {
    constructor(stub, s, d) {
        this.id = s.id;
        this.stub = stub;
        this.title = s.title;
//        this.active = s.hasOwnProperty('active') ? s.active : d.active;
//        this.votes = d.votes;
        this.team = [];
        for (var i in s) {
            this[i] = s[i];
        }
//        this.likes = 0;
    }
}
const setupStakeholders = () => {
    let defs = gamedata.defaults;
    let sh = gamedata.stakeholders;
    for (var i in sh) {
//        sh[i] = new Stakeholder(i, sh[i], defs);
        for (var j in defs) {
//            console.log(j, defs[j]);
            if (!sh[i].hasOwnProperty(j)) {
//                console.log(`${j} already exists`);
                sh[i][j] = defs[j];
            }

        }
//        console.log(sh[i]);
        sh[i] = new Stakeholder(i, sh[i], defs);
    }
    return sh;
};
const startNewSession = () => {
    let i = 0;
    let a = [];
    let sesh = new Session(1234);
    sesh.stakeholders = setupStakeholders();
    sesh.playersMap = new Map();
    sesh.players = {};
    // copy the list of players and thoroughly randomise it:
    for (let [k, v] of players) {
        sesh.players[k] = Object.assign({}, v);
        delete sesh.players[k].socket;
        a.push(k);
    };
    for (i = 0; i < 10; i++) {
        a.sort(() => {return Math.round(Math.random() * 2) - 1})
    };
//        console.log(`\nsesh, ${a.length} players connected\n`);
    // Loop through the stakeholders adding useres from the list until no more remain:
    while (a.length > 0) {
        for (i in sesh.stakeholders) {
            if (a.length > 0) {
                var p = a.pop();
                sesh.players[p].stakeholder = Object.assign({}, sesh.stakeholders[i]);
                sesh.stakeholders[i].team.push(p);
            }
        }
    }
    for (i in sesh.stakeholders) {
        let s = sesh.stakeholders[i];
        if (s.active === 1) {
            s.active = [s.team[Math.floor(Math.random() * s.team.length)]];
        }
        if (s.active < 0) {
            s.active = s.team.slice(0);
        }
    }
    return sesh;
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
        this.stakeholder = null;
    }
    setActive(boo) {
        this.active = boo;
    }
    handleDisconnect() {
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
    socket.on('addNewPlayer', (id, callback) => {
        const player = new Player(id);
        player.socket = socket;
        players.set(id, player);
        if (master !== null) {
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
        let disconnectedPlayer = null;
        for (const [playerId, player] of players.entries()) {
            if (player.socket.id === socket.id) {
                disconnectedPlayer = player;
                break;
            }
        }
        if (disconnectedPlayer) {
            players.delete(disconnectedPlayer.id);
            onPlayersUpdate();
        }
    };
    const removalV1 = () => {
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
    };
    const onPlayersUpdate = () => {
//        console.log('new onPLayersUpdate method');
        const playerIds = Array.from(players.keys());
//        io.emit('onGetPlayerIDs', playerIds);
        const thePlayers = Array.from(players.values());
        thePlayers.forEach((s, i) => {
//            console.log(i, s.socket.connected);
//            console.log(s);
            thePlayers[i] = {id: s.id, active: s.socket.connected};
        });
        io.emit('onGetPlayers', thePlayers);
    };
    socket.on('remove', () => {
        removal();
    });
    socket.on('disconnect', () => {
        // Find the player with the corresponding socket.id in the 'players' map
        let disconnectedPlayer = null;
        for (const [playerId, player] of players.entries()) {
            if (player.socket.id === socket.id) {
                disconnectedPlayer = player;
                break;
            }
        }
        if (disconnectedPlayer) {
            // Perform any actions required for the disconnected player
            disconnectedPlayer.handleDisconnect();
            // Remove the player from the 'players' map
//            players.delete(disconnectedPlayer.id);
            onPlayersUpdate();
        } else {
            console.log('no player found');
        }
    });
    socket.on('disconnectNOT', () => {
        const player = players.get(socket.id);
//        console.log(`socket.id: ${socket.id}`);
//        console.log(players);
        console.log(`disconnecting ${player}`)
        if (player) {
            player.handleDisconnect();
        }
    });
    socket.on('getPlayerIDs', () => {
        // Send the list of player IDs to the requesting client
        onPlayersUpdate();

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
    socket.on('startNewSession', () => {
//        startNewSession();
        var s = startNewSession();
//        console.log(s);
        console.log('emit startNewSession');
        io.emit('onNewSession', s);
    })
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
