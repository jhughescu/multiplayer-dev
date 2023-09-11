const express = require('express');
const exphbs = require('express-handlebars');
const http = require('http');
const socketIO = require('socket.io');
const fs = require('fs');
const path = require('path');
const csvWriter = require('csv-writer').createObjectCsvWriter;

const app = express();
const port = 3000;
const server = http.createServer(app);
const io = socketIO(server);

const isDev = true;
//const isDev = false;

//app.engine('handlebars', exphbs.engine({defaultLayout: 'backup'}));
app.engine('hbs', exphbs.engine({extname: '.hbs', defaultLayout: ''}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

const gameDataOut = 'gamedata.csv';
const playerPrefix = 'player-';

let logCount = 0;
let gamedata = null;
let sessionID = null;
let playersBasic = {};
let playersDetail = {};
let playersMap = new Map();
let session = null;
let storedData = null;
let sessionArchive = [];

class Player {
    constructor(id, socket) {
//        this.id = minifyPlayerID(id);
        this.id = id;
//        this.socket = socket;
        this.socketID = socket.id;
        this.enrolled = false;
        this.active = true;
        this.stakeholder = null;
    }
    getWebSocket () {
        return 'ws';
    };
    setActive(boo) {
        this.active = boo;
    };
    handleDisconnect() {
//        console.log('Player', this.id, 'disconnected.');
        this.connected = false;
//        alert('ham')
    };
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


const writeLogFile = (id, c, msg) => {
    let f = `../logs/log.${logCount++}.${id}.json`;
    if (msg) {
        c = Object.assign({msg: msg}, c);
    }
    fs.writeFile(f, JSON.stringify(c, null, 4), () => {console.log(`log written: ${f}`)})
};
const consoleLog = (m) => {
    const stack = new Error().stack;
    const l = stack.split('\n')[3].split(':')[2];
//    console.log(stack.split('\n')[3].split(':'));
    console.log(`Line ${l}: ${m}`);
//    console.log(m);
    io.emit('logoutput', `Line ${l}: ${m}`);
}
const clearLogs = (cb) => {
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
                    if (cb) {
                        cb();
                    }
                }
                if (e) throw e;
            })
        }
    });
};
const processData = (d) => {
    let s = d.stakeholders;
    let f = d.defaults;
    let m = d.map;
    for (var i in s) {
        s[i].stub = s[i].title.toLowerCase().replace(/ /gm, '_');
        for (var j in f) {
            if (!s[i].hasOwnProperty(j)) {
                s[i][j] = f[j];
            }
        }
    }
    for (var i in m) {
        m[m[i]] = i;
    }
    writeLogFile('data', d, 'gameData prepared by processData method');
    return d;
};
const roundNum = (n) => {
    let r = n;
    if (n < 10) {
        r = '0' + n;
    }
    return r;
};
const getDayCode = (d) => {
    let dc = `${String(d.getFullYear()).substr(2)}${roundNum(d.getMonth() + 1)}${roundNum(d.getDate())}`;
    return dc;
};
const updateTimer = () => {
//    console.log('ut');
    let d = new Date();
    let t = `${getDayCode(d)} ${d.getHours()}:${d.getMinutes()}:${roundNum(d.getSeconds())}`;
    io.emit('onUpdateTimer', t);
};
const updatePlayersBasic = () => {
    for (var i in playersDetail) {
        playersBasic[i] = getBasicPlayerSummary(playersDetail[i]);
    }
};
const updatePlayersDetail = () => {
    let pd = playersDetail;
    console.log(`~~~~~~~~~~~~~~~~~~~~  updatePlayersDetail (${Object.keys(pd).length} players)`);
//    console.log(storedData);
//    console.log(playersDetail);
//    console.log(playersMap);
    for (var i in pd) {
//        console.log(pd[i]);
        console.log(pd[i].socketID);
        console.log(playersMap.get(pd[i].socketID).connected);
        pd[i].connected = playersMap.get(pd[i].socketID).connected;
//        writeLogFile(`player-${pd[i].id}`, playersMap.get(pd[i].socketID));
    }
};
const updateSinglePlayerDetail = (id) => {
    // new player has connected, possibly after a server restart - check for stored update
    if (storedData) {
        let sp = storedData.p;
        id = id.replace(playerPrefix, '');
    //    console.log(`updateSinglePlayerDetail: ${id}`);
    //    console.log(sp);
        if (sp) {
            if (sp.hasOwnProperty(id)) {
        //        console.log(sp[id]);
                Object.assign(playersDetail[id], getDetailedPlayerSummary(sp[id], playersDetail[id]));
    //            console.log(playersDetail[id]);
            }
        }
    } else {
        console.log(`can't update ${id} because storedData has not been defined`)
    }
};
const onPlayersUpdate = () => {
//    console.log(`emit the event`);
    io.emit('playersUpdate', playersDetail);
};
const setSessionID = () => {
    var d = new Date();
    sessionID = getDayCode(d) + (Math.floor(Math.random() * 900) + 100);
};
const getSessionID = () => {
    return sessionID;
};
const requestSession = (o) => {
//    consoleLog(Object.keys(playersBasic).length);
//    io.emit('onRequestSession', o.sessionID === getSessionID() ? `sustain${getSessionID()}` : false);
//    if the session ID passed matches the session ID for the app, return the passed player id for verification, otherwise return false:
    let ro = {
        player: o.player,
        success: o.session === getSessionID()
    }
    console.log(`requestSession`);
    console.log(ro);
    console.log(getSessionID());

    onRequestSession(ro);
};
const onRequestSession = (o) => {
    let p = playersDetail[o.player.replace(playerPrefix, '')];
//    console.log('onRequestSession');
//    console.log(o);
//    console.log(o.player);
//    playersDetail[o.player.replace(playerPrefix, '')].enrolled = o.success;
//    console.log(playersDetail);
//    console.log(p);
    if (p) {
        p.enrolled = o.success;
    }
//    console.log(p);
    if (o.success) {
        updatePlayersBasic();

    }
//    console.log(p);
    io.emit('onRequestSession', o);
};
const terminateSession = () => {
    sessionArchive.push({playersDetail: playersDetail});
    playersBasic = {};
    playersDetail = {};
    playersMap = new Map();
    sessionID = null;
    io.emit('terminateSession');
};

const rNum = (i) => {
    if (i < 10) {i = '0' + i};
    return i;
};
const getPlayerPack = (cb) => {
    // return all available initial stuff to a newly connected player client
//    console.log(`playersBasic ${JSON.stringify(playersBasic)}`);
//    console.log(`playersBasic type: ${typeof(playersBasic)}`);
//    console.log(`getSessionID ${getSessionID()}`);
//    console.log(`getSessionID ${Boolean(getSessionID())}`);
    let d = new Date();
    let o = {
        timer: `${rNum(d.getHours())}:${rNum(d.getMinutes())}:${rNum(d.getSeconds())}`,
        isDev: isDev,
//        sessionID: isDev ? getSessionID() : 'ha, nice try',
        sessionID: isDev ? getSessionID() : Boolean(getSessionID()),
//        sessionID: getSessionID(),
        playersBasic: playersBasic,
        playersDetail: playersDetail,
        storedData: storedData,
        gamedata: gamedata
    }
//    console.log(typeof(cb));
    if (cb) {
        cb(o);
    }
};
const getGameMin = (cb) => {
    // Prepare & return a minimal game summary for localStorage
//    console.log('request to getGameMin');
    let o = {sid: sessionID, p: playersBasic};
//    console.log(o);
    cb(o);
};
const valConvert = (v) => {
    if (v === 'null') {
        v = null;
    }
    if (!isNaN(parseInt(v))) {
        v = parseInt(v);
    }
    if (v === 'true') {
        v = true;
    }
    if (v === 'false') {
        v = false;
    }
    return v;
};
const getBasicPlayerSummary = (plo) => {
    let s = '';
//    console.log(`get the player summary ${plo}`);
//    console.log(plo);
    s = `e${Number(plo.enrolled)},a${Number(plo.active)},s${plo.stakeholder}`;
    return s;
};
const getDetailedPlayerSummary = (str, o) => {
    let c = {
        enrolled: 'e',
        active: 'a',
        stakeholder: 's'
    };
    let d = {
        e: null,
        a: null,
        s: null
    };
    str.replace(/ /gm, '').split(',').forEach((i) => {
        d[i.substr(0, 1)] = valConvert(i.substr(1));

    });
    for (var i in c) {
        let v = d[c[i]];
        if (!isNaN(parseInt(v)) && v.toString().length === 1) {
            v = Boolean(v);
        }
        c[i] = v;
    }
//    console.log(`getDetailedPlayerSummary: ${str}`);
//    console.log(c);
//    console.log(o);
    return c;
};
const pingPlayer = (id) => {
    let pl = playersDetail[id];
    if (pl) {
        if (playersMap.has(pl.socketID)) {
            playersMap.get(pl.socketID).emit('ping');
        } else {
            console.log(`playersMap has no element with key ${pl.socketID}`);
        }
    } else {
        console.log(`no player with id ${id} in the playersDetail object`);
    }
};
const addNewPlayer = (o, socket, callback) => {
    let id = o.id;
    id = id.replace(gamedata.prefixes.player, '');
//    let pl = new Player(id, socket.id);
    let pl = new Player(id, socket);
    console.log(`~~~~~~~~~~~~~~~~ addNewPlayer id: ${id}, socketid: ${socket.id}`);
//        console.log(socket);
//    console.log(socket.id);
//    console.log(socket.customData);
    if (!playersBasic.hasOwnProperty(id)) {
        playersBasic[id] = getBasicPlayerSummary(pl);
        console.log(`~~~~~~~~~~~~~~~~~~~~~~~~~ add to playersBasic: ${id}, pb total now: ${Object.keys(playersBasic).length}`);
    } else {
        console.log(`${id} already added to playersBasic (${Object.keys(playersBasic).length} players registered)`);
//        console.log(playersBasic);
    }
    if (!playersDetail.hasOwnProperty(id)) {
        playersDetail[id] = pl;
        console.log(`~~~~~~~~~~~~~~~~~~~~~~~~~ add to playersDetail: ${id}, pd total now: ${Object.keys(playersDetail).length}`);
        updateSinglePlayerDetail(id);
        playersMap.set(socket.id, socket);
//        console.log(playersMap);
    } else {
//        console.log('player already registered, but this may be a socket update');
//        console.log(playersDetail[id].socketID);
//        console.log(socket.id);
        if (playersDetail[id].socketID !== socket.id) {
            console.log(`yep, it's a socket update, change the socketID and update the map`);

            playersMap.delete(playersDetail[id].socketID);
            playersDetail[id].socketID = socket.id;
            playersMap.set(socket.id, socket);
        }
    }
//    console.log(pl);
//    console.log(playersMap);
//    console.log(pl.socketID)
//    console.log(playersMap.get(pl.socketID));
//    console.log(playersMap[pl.socketID])
    console.log(`playersMap size: ${playersMap.size}`);
//    playersMap.get(playersDetail[id].socketID).emit('ping');
    io.emit('onAddNewPlayer', playersBasic);
    if (callback) {
        if (typeof (callback) === 'function') {
            callback({
                player: pl,
                playersBasic: playersBasic
//                    master: master,
//                    session: getSession(),
//                    gamedata: gamedata
            })
        }
    }
};
const startSession = () => {
    app.get(`/sustain${getSessionID()}`, (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'player.html'));
    });
//    io.emit('onNewSession', {session: s, gamedata: gamedata, players: playersObj});
    io.emit('newSession', {sid: getSessionID()});
    setInterval(updateTimer, 1000);
//    console.log(`startNewSession`);
};
const startNewSession = (cb) => {
    setSessionID();
    startSession();
    if (cb) {
//        console.log(`and the callback`);
        cb();
    }
}
const processStoredGame = (d) => {
    storedData = d;
    if (typeof(d) === 'string') {
            d = JSON.parse(d);
    }
    if (d.hasOwnProperty('sid')) {
        if (d.sid) {
            sessionID = d.sid;
            startSession();
        }
    }
    if (d.p) {
        updatePlayersDetail();
        for (var i in d.p) {
            if (playersDetail.hasOwnProperty(i)) {
                // Combine the playersDetail object with the stored data for the given player
                let det = getDetailedPlayerSummary(d.p[i], playersDetail[i]);
                Object.assign(playersDetail[i], det);
//                console.log(playersDetail[i]);
            }
        }
    }
    if (Object.keys(playersDetail).length > 0) {
//        console.log(`${Object.keys(playersDetail).length} playerDetail obejct(s) updated`);
    } else {
//        console.log('No playerDetail obejcts updated');
    }
    playersBasic = Object.assign({}, d.p);
    io.emit('onStoredGameFound');
    writeLogFile('playersDetailUpdated', playersDetail, 'this is the playersDetail object after being updated with data retrieved from localStorage')
};
const initApp = () => {
    consoleLog('initApp');
    gamedata = processData(require('./data/gamedata.json'));
    io.emit('serverStartup');
//    initSession();
};
const exitApp = () => {
    // This is called when the server shuts down & should not be explicitly called from within the app
    io.emit('serverShutdown');
    getPlayerPack(function (o) {
        io.emit('updateFull', o);
    })
    clearLogs();
};


io.on('connection', (socket) => {
    socket.on('customDataEvent', (customData) => {
        socket.customData = customData;
        console.log(`socket connected with role ${socket.customData.role} ${socket.id}`);
//        if () {}
    });
    socket.on('addNewPlayer', (o, callback) => {
        addNewPlayer(o, socket, callback);
        return;
        /*
        let id = o.id;
        id = id.replace(gamedata.prefixes.player, '');
        let pl = new Player(id, socket.id);
        console.log(`~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ addNewPlayer id: ${id}, socketid: ${socket.id}`);
//        console.log(socket);
        console.log(socket.id);
        console.log(socket.customData);
        if (!playersBasic.hasOwnProperty(id)) {
            playersBasic[id] = getBasicPlayerSummary(pl);
            console.log(`~~~~~~~~~~~~~~~~~~~~~~~~~ add to playersBasic: ${id}, pb total now: ${Object.keys(playersBasic).length}`);
        } else {
            console.log(`${id} already added to playersBasic (${Object.keys(playersBasic).length} players registered)`);
            console.log(playersBasic);
        }
        if (!playersDetail.hasOwnProperty(id)) {
            playersDetail[id] = pl;
            console.log(`~~~~~~~~~~~~~~~~~~~~~~~~~ add to playersDetail: ${id}, pd total now: ${Object.keys(playersDetail).length}`);
            updateSinglePlayerDetail(id);
        }
        io.emit('onAddNewPlayer', playersBasic);
        if (callback) {
            if (typeof (callback) === 'function') {
                callback({
                    player: pl,
                    playersBasic: playersBasic
//                    master: master,
//                    session: getSession(),
//                    gamedata: gamedata
                })
            }
        }
        */
    });
    socket.on('getBasicPlayers', (cb) => {
        cb(playersBasic);
    });
    socket.on('getPlayersDetail', (cb) => {
        updatePlayersDetail();
        cb(playersDetail);
    });
    socket.on('getGameData', (cb) => {
        if (cb) {
            cb(gamedata);
        }
    });
    socket.on('startNewSession', (cb) => {
//        var s = startNewSession();
        startNewSession(cb);
//        io.emit('onNewSession', {session: s, gamedata: gamedata, players: playersObj});
    });
    socket.on('areWeDev', (cb) => {
        cb(isDev);
    });
    socket.on('getPlayerPack', (cb) => {
//        console.log('call to getPlayerPack');
        getPlayerPack(cb);
    });
    socket.on('updateSession', () => {
//        console.log('onUpdateSession');
        io.emit('onUpdateSession');
    });
    socket.on('requestSession', (id) => {
//        console.log(`request session with ID ${id}`);
        requestSession(id);
    });
    socket.on('adminTerminateSession', () => {
        terminateSession();
    });
    socket.on('getPlayerIDs', (cb) => {
        cb(playersBasic);
    });
    socket.on('getGameMin', (cb) => {
        getGameMin(cb);
    });
    socket.on('storedGameFound', (d) => {
        processStoredGame(d);

    });
    socket.on('storedGameUpdated', (d) => {
        processStoredGame(d);

    });
    socket.on('playerPing', (id) => {
        pingPlayer(id);
    });
    socket.on('disconnect', () => {
        // Find the player with the corresponding socket.id in the 'players' map
        let disconnectedPlayer = null;
        for (const [playerId, player] of playersMap.entries()) {
//            console.log(player.id, socket.id);
            if (player.id === socket.id) {
                disconnectedPlayer = player;
                break;
            }
        }
        if (disconnectedPlayer) {
            // Perform any actions required for the disconnected player
            playersDetail[disconnectedPlayer.customData.id].handleDisconnect();
//            console.log(disconnectedPlayer.handshake.headers);
//            console.log(disconnectedPlayer.handshake.headers['sec-ch-ua']);
//            console.log(`disconnected client: ${disconnectedPlayer.handshake.headers['user-agent']}`);
//            console.log(`disconnected client: ${disconnectedPlayer.handshake.headers['user-agent']}`);
//            console.log(`disconnected client: ${disconnectedPlayer.handshake.headers['user-agent'].split(' ').reverse()[0]}`);
            // Remove the player from the 'players' map
//            players.delete(disconnectedPlayer.id);
            onPlayersUpdate();
            console.log(`disconnect!!!!!!!!!!`);
        } else {
            console.log('no player found');
        }
        console.log(`disconnect: ${disconnectedPlayer}`);
    });
});


// Code to run when the server app shuts down:
process.on('exit', () => {
    exitApp();
});
process.on('SIGINT', () => {
    exitApp();
});
process.on('SIGTERM', () => {
    exitApp();
});


// Serve the static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// All other routes will serve the 'index.html' file
app.get('', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
//app.get('/player', (req, res) => {
//    res.sendFile(path.join(__dirname, 'public', 'player.html'));
//});
//    app.get('/sustain', (req, res) => {
//        res.sendFile(path.join(__dirname, 'public', 'player.html'));
//    });
app.get('/admin', (req, res) => {
//    res.render('admin');
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});
app.get('/playersBasic', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'playersBasic.html'));
});
app.get('/gamedata', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'gamedata.html'));
});
app.get('/session', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'session.html'));
});
app.get('/test', (req, res) => {
    const d = {title: 'awesome', answer: 'Oh hell yes'};
    res.render('test', d);
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
app.get('/newlogin', (req, res) => {
    const d = {
        value: isDev ? getSessionID : 123456
    }
    res.render('newlogin', d); // Render the login template
});
app.get('/game', (req, res) => {
    res.render('game'); // Render the game template
});

server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    initApp();
});
