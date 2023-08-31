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
let session = null;

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
    return `${d.getFullYear()}${roundNum(d.getMonth() + 1)}${roundNum(d.getDate())}`;
};
const updateTimer = () => {
//    console.log('ut');
    let d = new Date();
    let t = `${getDayCode(d)} ${d.getHours()}:${d.getMinutes()}:${roundNum(d.getSeconds())}`;
    io.emit('onUpdateTimer', t);
};
const setSessionID = () => {
    var d = new Date();
    sessionID = getDayCode(d) + '4';
};
const getSessionID = () => {
    return sessionID;
};
const requestSession = (o) => {
//    consoleLog(Object.keys(playersBasic).length);
//    io.emit('onRequestSession', o.sessionID === getSessionID() ? `sustain${getSessionID()}` : false);
//    if the session ID passed matches the session ID for the app, return the passed player id for verification, otherwise return false:
    io.emit('onRequestSession', {player: o.player, success: o.session === getSessionID()});
};
const terminateSession = () => {
    playersBasic = {};
    io.emit('terminateSession');
};
const getPlayerPack = (cb) => {
    // return all available initial stuff to a newly connected player client
//    console.log(`playersBasic ${JSON.stringify(playersBasic)}`);
//    console.log(`playersBasic type: ${typeof(playersBasic)}`);
    let o = {
        isDev: isDev,
        sessionID: isDev ? getSessionID() : "ha, nice try",
        playersBasic: playersBasic,
        gamedata: gamedata
    }
    cb(o);
};
const getGameMin = (cb) => {
    // Prepare & return a minimal game summary for localStorage
    let o = {p: playersBasic};
    cb(o);
};
const initSession = () => {
    setSessionID();
    app.get(`/sustain${getSessionID()}`, (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'player.html'));
    });
    setInterval(updateTimer, 1000);
}
const initApp = () => {
    consoleLog('init app');
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

//io.use((server, next) => {
//
//});

io.on('connection', (socket) => {
//    console.log(`first connection: ${socket.id}`);
//    console.log('socket.gameInfo');
//    console.log(socket.gameInfo);
    socket.on('customDataEvent', (customData) => {
        socket.customData = customData;
//        console.log(`socket connected with role ${socket.customData.role} ${socket.id}`);
//        if () {}
    });
    socket.on('addNewPlayer', (id, callback) => {
        id = id.replace(gamedata.prefixes.player, '')
        console.log(`addNewPlayer: ${id}`);
//        console.log(gamedata);
        if (!playersBasic.hasOwnProperty(id)) {
            playersBasic[id] = {};
        }
//        const player = new Player(id);
//        player.socket = socket;
//        players.set(id, player);
//        if (master !== null) {
//            io.emit('newPlayer', id);
//        }
        io.emit('onAddNewPlayer', playersBasic);
        if (callback) {
            if (typeof (callback) === 'function') {
//                callback(getPlayerPack());
                callback({
                    playersBasic: playersBasic
//                    master: master,
//                    session: getSession(),
//                    gamedata: gamedata
                })
            }
        }
    });
    socket.on('getBasicPlayers', (cb) => {
        cb(playersBasic);
    });
    socket.on('getGameData', (cb) => {
        if (cb) {
            cb(gamedata);
        }
    });
    socket.on('startNewSession', () => {
        var s = startNewSession();
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
        console.log(`stored game found with ${Object.keys(d.p).length} elements`);
//        console.log(d);
        if (typeof(d) === 'string') {
            d = JSON.parse(d);
        }
//        console.log(d.p);
        playersBasic = Object.assign({}, d.p);
        io.emit('onStoredGameFound');
//        console.log(`playersBasic ${Object.assign({}, d.p)}`);
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
