const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const fs = require('fs');
const path = require('path');
const csvWriter = require('csv-writer').createObjectCsvWriter;

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

let gamedata = null;
//console.log('gamedata');
//console.log(gamedata);
const gameDataOut = 'gamedata.csv';

const players = new Map();
let playersObj = null;
let master = null;
let int = null;
let isDev = true;
let sessionActive = false;
let session = null;

let logCount = 0;
const writeLogFile = (id, c, msg) => {
//    let f = '../logs/' + id + '.json';
    let f = `../logs/log.${logCount++}.${id}.json`;
    if (msg) {
        c = Object.assign({msg: msg}, c);
    }
//    console.log(`writing log: ${id}`);
    fs.writeFile(f, JSON.stringify(c, null, 4), () => {console.log(`log written: ${f}`)})
};
const clearLogs = (cb) => {
//    fs.unlink('../logs/', () => {console.log('gone')});
//    console.log('clear any existing logs');
    let p = '../logs';
    fs.readdir(p, (err, files) => {
        let l = files.length
        if (l === 0) {
            if (cb) {
                cb();
            }
        }
        if (err) throw err;
        for (const f of files) {
            let d = `${p}/${f}`;
            fs.copyFileSync(d, d.replace('logs/', 'logscopy/'));
            fs.unlink(d, (e) => {
                if (l-- === 1) {
//                    console.log('all log files deleted');
                    if (cb) {
                        cb();
                    }
                }
                if (e) throw e;
            })
        }
    });
//    console.log(l);
//    console.log('clearing dunne');
};
const waitForMaster = () => {
    if (master !== null) {
        clearInterval(masterTimer);
        clearInterval(int);
    }
};
const processData = (d) => {
    let s = d.stakeholders;
    let f = d.defaults;
    let m = d.map;
    writeLogFile('steak', s, 'stakeholders as used by processData method');
    for (var i in s) {
        s[i].stub = s[i].title.toLowerCase().replace(/ /gm, '_');
        for (var j in f) {
            if (!s[i].hasOwnProperty(j)) {
                s[i][j] = f[j];
            }
        }
    }
    for (var i in m) {
//        console.log(i, m[i]);
        m[m[i]] = i;
    }
//    console.log(m);
    writeLogFile('data', d, 'gameData prepared by processData method');
    return d;
};
const setupStakeholders = () => {
    let defs = gamedata.defaults;
    let sh = Object.assign({}, gamedata.stakeholders);
    let k = null;
    writeLogFile('stakeholdersPre', sh, 'list of stakeholders from the start setupStakeholders method');

    for (var i in sh) {

        k = `st_${sh[i].id}`;

        for (var j in defs) {
            if (!sh[i].hasOwnProperty(j)) {
                sh[i][j] = defs[j];
            }

        }
        sh[i] = new Stakeholder(i, sh[i], defs);
        sh[i] = minifyStakeholder(i, sh[i]);
    }
    writeLogFile('stakeholdersPost', sh, 'list of stakeholders from the setupStakeholders method');
    return sh;
};
const minifyStakeholder = (id, sh) => {
    let m = {
        id: sh.id,
        team: sh.team,
        v: sh.votes,
        vIn: sh.voteObj.total,
        active: sh.active
    };
//    writeLogFile(`stakeholdersDev-${id}1`, sh);
//    writeLogFile(`stakeholdersDev-${id}2`, m);
    return m;
};
const unpackStakeholder = (id, sh) => {

};
const setSessionActive = (boo) => {
//    console.log(`setSessionActive ${boo}`);
    sessionActive = boo;
};
const getShortPlayerID = (i) => {
    return i.replace('player-', '');
};
const getFullPlayerID = (i) => {
    let id = i;
    if (i.indexOf('player-') > -1) {
        id = 'player-' + i;
    }
    return id;
};
const minifyPlayerID = (id) => {
    return id.replace('player-', '');
};
const startNewSession = (cb) => {
    let i = 0;
    let a = [];
    let sesh = new Session(1234);
    sesh.stakeholders = setupStakeholders();
//    sesh.playersMap = new Map();
    sesh.players = {};
    // copy the list of players and thoroughly randomise it:
    for (let [k, v] of players) {
        k = minifyPlayerID(k);
        sesh.players[k] = Object.assign({}, v);
        delete sesh.players[k].socket;
        a.push(k);
    };
    for (i = 0; i < 10; i++) {
        a.sort(() => {return Math.round(Math.random() * 2) - 1})
    };
    // Loop through the stakeholders adding users from the list until no more remain:
    let brake = 3000;
    console.log(a.length);
    console.log(sesh);
    while (a.length > 0 && brake-- > 0) {
//    console.log('########################################## HERE' + brake);
        for (i in sesh.stakeholders) {
            console.log('>> ' + i);
            if (a.length > 0) {
                var p = minifyPlayerID(a.pop());
                console.log(p);
                sesh.players[p].stakeholder = sesh.stakeholders[i];
                sesh.stakeholders[i].team.push(p);
                console.log(sesh.players[p]);
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
    setSessionActive(true);
    playersObj = sesh.players;
    delete sesh.players;
    session = sesh;
    if (cb) {
        cb(sesh);
    }
    return sesh;
};
const endSession = () => {
    setSessionActive(false);
};
const getSession = () => {
    let s = false;
    if (sessionActive) {
        s = session;
    }
//    console.log('request to getSession');
    return s;
};
const getPlayersObject = () => {
    let po = Object.fromEntries(players.entries());
    for (var i in po) {
        delete po[i].socket;
    }
    return po;
};
const startApp = () => {
    console.log('all ready, we can start');
    gamedata = processData(require('./data/gamedata.json'));
    int = setInterval(waitForMaster, 500);
};
const init = () => {
//    console.log('init');
    // first clear away any old logs (after copying them for reference)
    // Then fire 'startApp' to kick everything off
    clearLogs(startApp);
    setTimeout(function () {
//        gamedata = processData(require('./data/gamedata.json'));
//        int = setInterval(waitForMaster, 500);
    }, 1000);
};
const depart = () => {
    console.log('get out of here');
    clearLogs();
};


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
        this.id = minifyPlayerID(id);
        this.socket = null;
        this.active = true;
        this.stakeholder = null;
    }
    setActive(boo) {
        this.active = boo;
    }
    handleDisconnect() {
//        console.log('Player', this.id, 'disconnected.');
    }
};
class Session {
    constructor(id) {
        this.id = id;
    }
};
class Stakeholder {
    constructor(stub, s, d) {
        this.id = s.id;
        this.stub = stub;
        this.title = s.title;
//        this.active = s.hasOwnProperty('active') ? s.active : d.active;
//        this.votes = d.votes;
        this.team = [];
        this.voteObj = {
            total: 0,
            detail: {}
        };
        for (var i in s) {
            this[i] = s[i];
        }
//        this.likes = 0;
    }
};


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

//        const player = new Player(id);
//        player.socket = socket;
//        players.set(id, player);
//        if (master !== null) {
//            io.emit('newPlayer', id);
//        }
        if (callback) {
            if (typeof (callback) === 'function') {
                callback({
//                    master: master,
//                    session: getSession(),
//                    gamedata: gamedata
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
        console.log('startNewSession');
        var s = startNewSession();
//        console.log('send the gamedata');
//        console.log(gamedata);
        writeLogFile('gameDataAsSent', gamedata, 'startNewSession emit method');
        writeLogFile('players', getPlayersObject(), 'players as in startNewSession emit method');

        io.emit('onNewSession', {session: s, gamedata: gamedata, players: playersObj});
//        var s2 = startNewMiniSession();
    });
    socket.on('endSession', () => {
        endSession();
    });
    socket.on('castVote', (s, src) => {
        session.stakeholders[s].voteObj.total += 1;
        session.players[src].stakeholder.votes -= 1;
//        console.log(session.players[src]);
        io.emit('onNewSession', session);
//        console.log(socket);
    });
    socket.on('getSession', (cb) => {
        if (cb) {
            cb(session);
        } else {
            console.log(`This method won't work without a callback`);
        }
    });
});


// Code to run when the server app shuts down:
process.on('exit', () => {
    depart();
});
process.on('SIGINT', () => {
    depart();
});
process.on('SIGTERM', () => {
    depart();
});

// Serve the static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// All other routes will serve the 'index.html' file
app.get('', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/player', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'player.html'));
});
app.get('/session', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'session.html'));
});

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

const port = 3000;
server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    init();
});
