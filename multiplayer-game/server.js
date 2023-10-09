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
        this.stakeholder = -19;
//        writeLogFile(`playerinstance`, this);
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
        this.round = 0;
        this.scores = {
            round1: {},
            round2: {}
        };
    }
    assigned;
    active;
    scores;
    round;
    setAssigned(boo) {
        this.assigned = boo;
    }
    setRound(n) {
        this.round = n;
        this.scores[`round${n}`] = {};
    }
    getRound() {
        return this.round;
    }
    getCurrentScores() {
        return this.scores[`round${this.round}`];
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
    fs.writeFile(f, JSON.stringify(c, null, 4), () => {
        console.log(`log written: ${f}`)
    })
};
const updateLogFile = (id, c, msg) => {
    let f = `../logs/log.${id}.json`;
    if (msg) {
        c = Object.assign({msg: msg}, c);
    }
    fs.writeFile(f, JSON.stringify(c, null, 4), () => {
        console.log(`log written: ${f}`);
    })
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
//    let s = d.stakeholders;
    let t = d.teams;
    let f = d.defaults;
    let m = d.map;
    d.mainTeams = [];
    for (var i in t) {
        t[i].stub = t[i].title.toLowerCase().replace(/ /gm, '_');
        for (var j in f) {
            if (!t[i].hasOwnProperty(j)) {
                t[i][j] = f[j];
            }
        }
        if (t[i].hasMax) {
            d.mainTeams.push(t[i]);
        }
    }
    for (var i in m) {
        m[m[i]] = i;
    }
    writeLogFile('data', d, 'gameData prepared by processData method');
    return d;
};
const processDataV1 = (d) => {
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
    sortPlayersDetail();
//    console.log(`~~~~~~~~~~~~~~~~~~~~  updatePlayersDetail (${Object.keys(pd).length} players)`);
//    console.log(storedData);
//    console.log(playersDetail);
//    console.log(playersMap);
    for (var i in pd) {
//        console.log(pd[i]);
//        console.log(pd[i].socketID);
//        console.log(playersMap.get(pd[i].socketID).connected);
        pd[i].connected = playersMap.get(pd[i].socketID).connected;
//        writeLogFile(`player-${pd[i].id}`, playersMap.get(pd[i].socketID));
    }
};
const updateSinglePlayerDetail = (id) => {
    // new player has connected, possibly after a server restart - check for stored update
    if (storedData) {
        let sp = storedData.p;
        id = id.replace(playerPrefix, '');
//        console.log(`updateSinglePlayerDetail: ${id}`);
    //    console.log(sp);
        if (sp) {
            if (sp.hasOwnProperty(id)) {
//                console.log('assigning object');
//                console.log(sp[id]);
                Object.assign(playersDetail[id], getDetailedPlayerSummary(sp[id], playersDetail[id]));
//                console.log(playersDetail[id]);
            } else {
//                console.log(`no player found with ID ${id}`);
            }
        }
    } else {
        console.log(`can't update ${id} because storedData has not been defined`)
    }
};
const getPlayerFromID = (id) => {
    let pl = playersDetail[id];
    return pl;
};
const getSocketFromID = (id) => {
    let sock = null;
    sock = getPlayerFromID(id).socketID;
    sock = playersMap.get(sock);
    return sock;
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
const getSession = (cb) => {
    cb(session);
};
const setMaxVotes = (m) => {
//    console.log(`setMax ${m}`)
    io.emit('upateMaxVotes', m);
    let ts = gamedata.teams;
    for (var t in ts) {
        t.votes = m;
    }
};
const requestSession = (o) => {
//    if the session ID passed matches the session ID for the app, return the passed player id for verification, otherwise return false:
    let ro = {
        player: o.player,
        success: o.session === getSessionID(),
        sessionAssigned: session.assigned
    }
    onRequestSession(ro);
};
const allPlayersEnrolled = () => {
    let allIn = true;
    for (var i in playersDetail) {
        if (!playersDetail[i].enrolled) {
            allIn = false;
            break;
        }
    }
    io.emit('enrollmentUpdate', {allIn: allIn});
    return allIn;
};
const onRequestSession = (o) => {
    let p = playersDetail[o.player.replace(playerPrefix, '')];
    if (p) {
        p.enrolled = o.success;
    }
    if (o.success) {
        updatePlayersBasic();
//        console.log(`success, what sbout the session?`);
//        console.log(session);
        if (session.assigned) {
//            console.log('session is already assigned, this one goes into the public voices group');
//            console.log(o);
            latecomer(o);
        }
    }
    o.allIn = allPlayersEnrolled();
    io.emit('onRequestSession', o);
};
const terminateSession = () => {
    sessionArchive.push({playersDetail: playersDetail});
    playersBasic = {};
    playersDetail = {};
    playersMap = new Map();
    sessionID = null;
    session = null;
    io.emit('terminateSession');
};
//

const pvStakeholderScoreFunk = (o) => {
    let sc = session.getCurrentScores();
    if (!sc.hasOwnProperty('pvVotes')) {
        sc.pvVotes = {
            list: [],
            summary: {}
        };
    }
    sc.pvVotes.list.push(o);
    let ob = Object.assign({}, sc.pvVotes);
    Object.values(gamedata.teams).forEach((p) => {
        if (p.hasMax) {
            ob.summary[`t-${p.id}`] = {};
        }
    });
    ob.list.forEach((v) => {
        if (!ob.summary[`t-${v.targ}`].hasOwnProperty(`v-${v.team}`)) {
            ob.summary[`t-${v.targ}`][`v-${v.team}`] = {a: [], t: 0, m: 0}
        }
        ob.summary[`t-${v.targ}`][`v-${v.team}`].a.push(v.v);
    });
    Object.values(ob.summary).forEach((a) => {
        Object.values(a).forEach((s) => {
            s.a.forEach((v) => {
                s.t += v;
            });
            // round to 2 DP
            s.m = Math.round((s.t / s.a.length) * 100) / 100;
        });
    });
    updateLogFile('theob', ob);
    updateLogFile('thesession', session);
    // Store the scores in the scoring player object
    let pl = getPlayerFromID(o.src);
    if (!pl.hasOwnProperty('scores')) {
        pl.scores = {};
    }
    let r = `r${session.getRound()}`;
    if (!pl.scores.hasOwnProperty(r)) {
        pl.scores[r] = [];
    }
    pl.scores[r].push({targ: o.targ, v: o.v});
    // Update the vote total in the scoring player
    pl.teamObj.votes -= Math.abs(o.v);
    io.emit('scoreUpdate', o);
    session.getCurrentScores().pvVotes = ob;
    return ob;
}
const pvStakeholderScore = (o) => {
    let t = Object.values(gamedata.teams);
    if (session) {
        if (session.assigned) {
            if (t[o.targ].team) {
                // separate the conditional logic from the method, for clarity
                return pvStakeholderScoreFunk(o);
            }
        }
    }
};

const stStakeholderScoreFunk = (o) => {
    let sc = session.getCurrentScores();
    if (!sc.hasOwnProperty('stakeholderVotes')) {
        sc.stakeholderVotes = {
            list: [],
            summary: {}
        };
    }
    sc.stakeholderVotes.list.push(o);
    let ob = Object.assign({}, sc.stakeholderVotes);
    Object.values(gamedata.teams).forEach((p) => {
        if (p.hasMax) {
            ob.summary[`t-${p.id}`] = {};
        }
    });
    ob.list.forEach((v) => {
        if (!ob.summary[`t-${v.targ}`].hasOwnProperty(`v-${v.team}`)) {
            ob.summary[`t-${v.targ}`][`v-${v.team}`] = {a: [], t: 0}
        }
        ob.summary[`t-${v.targ}`][`v-${v.team}`].a.push(v.v);
    });
    Object.values(ob.summary).forEach((a) => {
        Object.values(a).forEach((s) => {
            s.a.forEach((v) => {
                s.t += v;
            });
        });
    });
    updateLogFile('thestob', ob);
    updateLogFile('thesession', session);
    // Store the scores in the scoring player object
    let pl = getPlayerFromID(o.src);
    if (!pl.hasOwnProperty('scores')) {
        pl.scores = {};
    }
    let r = `r${session.getRound()}`;
    if (!pl.scores.hasOwnProperty(r)) {
        pl.scores[r] = [];
    }
    pl.scores[r].push({targ: o.targ, v: o.v});
    // Update the vote total in the scoring player
    pl.teamObj.votes -= Math.abs(o.v);
    io.emit('scoreUpdate', o);
    session.getCurrentScores().stakeholderVotes = ob;
    return ob;
}

const stStakeholderScore = (o) => {
//    console.log('first score!!');
//    console.log(o);
    let t = Object.values(gamedata.teams);
    if (session) {
        if (session.assigned) {
            if (t[o.targ].team) {
                // separate the conditional logic from the method, for clarity
//                console.log('score!!');
//                console.log(o);
                return stStakeholderScoreFunk(o);
            }
        }
    }
};

const rNum = (i) => {
    if (i < 10) {i = '0' + i};
    return i;
};
const getPlayerPack = (cb, sock) => {
    // return all available initial stuff to a newly connected player client
    let d = new Date();
    let o = {
        timer: `${rNum(d.getHours())}:${rNum(d.getMinutes())}:${rNum(d.getSeconds())}`,
        isDev: isDev,
        sessionID: isDev ? getSessionID() : Boolean(getSessionID()),
        session: session,
        playersBasic: playersBasic,
        playersDetail: playersDetail,
        storedData: storedData,
        gamedata: gamedata
    }
//    writeLogFile('getPlayerPack', {
//        id: sock.id,
//        pid: sock.customData,
//        detail: o.playersDetail
//    });
    if (cb) {
//        console.log(`getPlayerPack callback:`)
        cb(o);
    }
};
const getPlayer = (id, cb) => {
    // return just the player defined by id
//    console.log(`request to getPlayer ${id}`);
    cb(getPlayerFromID(id));
};
const getGameMin = (cb) => {
    // Prepare & return a minimal game summary for localStorage
//    console.log('request to getGameMin');
//    let o = {sid: sessionID, p: playersBasic};
    let s = {
        sid: sessionID,
        ass: false
    }
    if (session) {
        if (session.hasOwnProperty('assigned')) {
            if (session.assigned !== undefined) {
                s.ass = session.assigned;
            }
        }
    }
    let o = {
        s: s,
        p: playersBasic};
//    console.log(o);
    cb(o);
};
const valConvert = (v) => {
//    console.log(`IN ${v}`);
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
//    console.log(`OUT ${v}`);
    return v;
};
const getBasicPlayerSummary = (plo) => {
    let s = '';
//    console.log(`get the player summary ${plo}`);
//    console.log(plo);
    s = `e${Number(plo.enrolled)},a${Number(plo.active)},s${plo.stakeholder}`;
//    console.log(`store string: ${s}`);
    return s;
};
const getDetailedPlayerSummary = (str, o) => {
//    console.log('oooooooooooooooooooooooooooooooooo')
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

        if (!isNaN(parseInt(v)) && v.toString().length === 1 && c[i] !== 's') {
            // don't boolean if c[i] is 's' (stakeholder is an integer)
            v = Boolean(v);
        }
        if (c[i] === 's') {
//            console.log(i, c[i], v);
//            console.log(gamedata.teams);
//            console.log(Object.values(gamedata.teams));
//            console.log(Object.values(gamedata.teams)[c[i]]);
//            v = Object.values(gamedata.teams)[v].title;
        }
        c[i] = v;
    }
//    console.log(`getDetailedPlayerSummary: ${str}`);
//    console.log(c);
//    console.log(o);
    return c;
};
const sortPlayersDetail = () => {
    let d = playersDetail;
    let od = {};
    let i = null;
    for (i in d) {
        if (!d[i].hasOwnProperty('fake') || !d[i].fake) {
            od[i] = d[i];
        }
    }
    for (i in d) {
//        console.log(` - ${d[i].fake}`);
        if (d[i].fake) {
            od[i] = d[i];
        }
    }
//    writeLogFile('sortedPlayers', od);
    playersDetail = od;
};
const pingPlayer = (id) => {
    let pl = playersDetail[id];
    if (pl) {
        if (playersMap.has(pl.socketID)) {
            playersMap.get(pl.socketID).emit('ping');
        } else {
//            console.log(`playersMap has no element with key ${pl.socketID}`);
        }
    } else {
//        console.log(`no player with id ${id} in the playersDetail object`);
    }
};
const addNewPlayer = (o, socket, callback) => {
    let id = o.id;
    id = id.replace(gamedata.prefixes.player, '');
    let pl = new Player(id, socket);
//    writeLogFile('newplayer', pl);
    if (o.fake) {
        pl.fake = true;
    } else {
        pl.fake = false;
    }
    console.log(`~~~~~~~~~~~~~~~~ addNewPlayer id: ${id}, socketid: ${socket.id}`);
//    console.log(o);
    if (!playersBasic.hasOwnProperty(id)) {
        playersBasic[id] = getBasicPlayerSummary(pl);
    }
    if (!playersDetail.hasOwnProperty(id)) {
        playersDetail[id] = pl;
        updateSinglePlayerDetail(id);
        playersMap.set(socket.id, socket);
    } else {
        if (playersDetail[id].socketID !== socket.id) {
//            console.log(`yep, it's a socket update, change the socketID and update the map`);
            playersMap.delete(playersDetail[id].socketID);
            playersDetail[id].socketID = socket.id;
            playersMap.set(socket.id, socket);
        }
    }
    io.emit('onAddNewPlayer', playersBasic);
    allPlayersEnrolled();
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
const getFakePlayers = (cb) => {
    // dev method; return an object containing all player objects with a 'fake=true' property
    let p = playersDetail;
    let rp = {};
    Object.entries(p).forEach(([k, v]) => {
//        console.log(k);
//        console.log(v);
        if (v.fake) {
            rp[k] = Object.assign({}, v);
        }
    });
    cb(rp);
};
const addFakePlayers = () => {
    // dev method: stored data has fake players but the players have not been added
    if (isDev) {
        console.log(`let's do it`);
        let sp = storedData;
        if (sp) {
            sp = storedData.p
            let n = 0;
            for (var i in sp)  {
                if (i.substr(0, 1) === 'f') {
                    n++;

                }
            }
            io.emit('getFakePlayers', n);
        }
    }
};
const startSession = () => {
//    console.log(`startSession called`);
//    console.log(session);
    if (session === null) {
//        if (!session.active) {
            let sid = getSessionID();
            app.get(`/sustain${getSessionID()}`, (req, res) => {
                res.sendFile(path.join(__dirname, 'public', 'player.html'));
            });
            io.emit('newSession', {sid: sid});
            console.log(`Hey, it's a new session, that's awesome`);
            session = new Session(sid);
            session.active = true;
            setInterval(updateTimer, 1000);
//        }
    } else {
//        console.log(`session already in progress, can't start another`);
    }
};
const startNewSession = (cb) => {
    setSessionID();
//    console.log(`startNewSession calls startSession`);
    startSession();
    if (cb) {
//        console.log(`and the callback`);
        cb();
    }
}
const processStoredGame = (d) => {
    storedData = d;
//    console.log('PROCESS-STORED-GAME');
    if (typeof(d) === 'string') {
            d = JSON.parse(d);
    }
    if (d.hasOwnProperty('sid')) {
        if (d.sid) {
            sessionID = d.sid;
//            console.log(`processStoredGame calls startSession`);
            startSession();
        }
    }
    if (d.p) {
        updatePlayersDetail();
        for (var i in d.p) {
//            console.log(` - ${i}`);
            if (playersDetail.hasOwnProperty(i)) {
                // Combine the playersDetail object with the stored data for the given player
                let det = getDetailedPlayerSummary(d.p[i], playersDetail[i]);
                Object.assign(playersDetail[i], det);

//                console.log(` - ${playersDetail[i]}`);
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
//    writeLogFile('playersDetailUpdated', playersDetail, 'this is the playersDetail object after being updated with data retrieved from localStorage')
};
const pageTypeAdded = (t) => {
//    console.log(`pageTypeAdded :${t}`);
    if (t === 'admin') {
//        addFakePlayers();
    }
};
const getGameData = (cb) => {
    cb(gamedata);
};
const sortWeight = (a, b) => {
    // sort an array of teams according to the weighting factor
    let r = 0;

    if (a[1].weight > b[1].weight) {
        r = -1;
    }
    if (a[1].weight < b[1].weight) {
        r = 1;
    }
//    console.log(a[1].weight, b[1].weight, r);
    return r;
};
const sortFake = (a, b) => {
    // sort IDs depending on whether they are fakes, i.e. have an 'f' prefix
    // (fakes at the end)
    let r = 0;
    if (a.substr(0, 1) === 'f') {
        r = 1;
    }
    if (b.substr(0, 1) === 'f') {
        r = -1;
    }
//    console.log(r);
    return r;
};
const sortRandom = (a, b) => {
    const r = Math.ceil((Math.random() * 3) - 2);
//    console.log(r);
    return r;
};
const previewDistribution = (tin) => {
    console.log(`########################previewDistribution`);
    let c = 0;
    let d = [];
    let t = JSON.parse(JSON.stringify(tin));
    t = Object.entries(t);
    t.sort(sortRandom);
    t.sort(sortRandom);
    t.sort(sortRandom);
    t.sort(sortWeight);
    t.forEach(([k, v]) => {
        c += v.weight;
        for (var j = 0; j < v.weight; j++) {
            d.push({id: k, n: v.id, t: []});
        }
    });
    let p = Object.keys(playersDetail);
    p.sort(sortRandom);
    p.sort(sortRandom);
    p.sort(sortRandom);
//    console.log(p);
    while (p.length > 0) {
        d.forEach((dt) => {
            if (p.length > 0) {
                let cp = p.pop();
                dt.t.push(cp);
            }
        });

    };
//    console.log(d);
    t = JSON.parse(JSON.stringify(tin));
//    console.log(t);
//    Object.keys(t).forEach();
    d.forEach((te) => {
        let team = te.id;
        console.log(t[team].title);
        if (t[te.id]) {
//            console.log(`team found in gamedata with id ${te.id}`);
            if (!t[te.id].hasOwnProperty('team')) {
                t[te.id].team = te.t;
            } else {

                // - here is a problem: the array is cocatenated each time the method runs
                // - solve by using an obect instead?

                let a = t[te.id].team.reduce((acc, id) => {
                    acc[id] = {};
                    return acc;
                }, {});
//                console.log(`a:`);
//                console.log(a);
                let b = te.t;
//                console.log('b:');
//                console.log(b);
                if (b) {
                    b = te.t.reduce((acc, id) => {
                        acc[id] = {};
                        return acc;
                    }, {});
                }
                console.log(a);
                console.log(b);
                a = Object.assign(a, b);
//                console.log(`a final:`);
                console.log(a);

//                t[te.id].team = t[te.id].team.concat(te.t);
                t[te.id].team = Object.keys(a);
                console.log(`team has ${Object.keys(a).length} members`);
            }
            t[te.id].teamSize = t[te.id].team.length
        }
    });
//    console.log(t);
//    console.log(playersDetail);
    return t;
};
const previewTeams = (cb) => {
//    console.log('previewTeams');
    let teams = {};
    let d = gamedata;
    if (d.hasOwnProperty('teams')) {
        d = d.teams;
    } else {
        d = d[d.definitions['teams']];
    }
    teams = previewDistribution(d);
    cb(teams);
};
const getTeamMax = () => {
    let d = gamedata;
    let tm = Object.keys(d.teams);
    let p = Object.keys(playersDetail);
    let max = tm.length;
    if (d.settings) {
        if (d.settings.teamMax) {
            max = d.settings.teamMax;
        }
    }
//    console.log(`${max} before`);
    while ((max * tm.length) > p.length) {
        max--;
    }
//    console.log(`${max} after`);
    return max;
};
const copyObj = (o) => {
    return JSON.parse(JSON.stringify(o));
};
const latecomer = (o) => {
    // someone has joined an active session, assign them to one of the public voices teams
    let p = playersDetail;
    let t = Object.assign({}, gamedata.teams);
    let tn = {};
    let pid = o.player.replace(playerPrefix, '');
//    console.log('adding a latecomer to the public voices team with the least members');
    for (var i in t) {
        if (!t[i].hasMax) {
            tn[i] = t[i];
        }
    }
    let min = 999;
    for (var i in tn) {
        if (tn[i].team.length < min) {
            min = tn[i].team.length;
            // NOTE: reusing t
            t = tn[i];
        }
    }
    playersDetail[pid].stakeholder = t.id;
    playersDetail[pid].teamObj = Object.assign(copyObj(t), {});
    updatePlayersBasic();
    t.team.push(pid);
};
const assignTeams = (cb) => {
    let d = gamedata;
    let teams = d.teams;
    let max = getTeamMax();
    let p = Object.keys(playersDetail);
    let t = 0;
    Object.values(teams).forEach((v) => {
        v.team = [];
        if (v.hasMax) {
            t++
        }
    });
    if (t === 0) {
        t = 1;
    }
    let top = max * t;
    if (top > p.length) {
        top = p.length;
    }
    let tc = Object.keys(JSON.parse(JSON.stringify(teams)));
    p.sort(sortRandom);
    p.sort(sortRandom);
    p.sort(sortRandom);
    p.sort(sortFake);
    for (var i = 0; i < (max * Object.keys(teams).length); i++) {
        let tn = p.shift();
        if (tn) {
            Object.values(teams)[i%Object.keys(teams).length].team.push(tn);
        }
    }
    while (p.length > 0) {
        Object.values(teams).forEach((v) => {
            if (!v.hasMax) {
                if (p.length > 0) {
                    let tn = p.shift();
                    v.team.push(tn);
                }
            }
        });
    }
    console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@');
    Object.entries(gamedata.teams).forEach(([k, v]) => {
//        console.log(k);
//        console.log(v.hasLead);
        v.team.forEach((p, i) => {
//            console.log(p, i);
            let pl = playersDetail[p];
            if (pl) {
                if (v.hasLead) {
                    pl.isLead = i === 0;
                }
                pl.stakeholder = v.id;
                pl.teamObj = Object.assign(copyObj(v), {});
                let sock = playersMap.get(pl.socketID);
                sock.emit('onAssignTeams', k);
            } else {
                console.log(`${p} not defined in playersDetail`);
            }
        });
    });
    updatePlayersBasic();
    if (session){
        session.setAssigned(true);
    }
    updateLogFile('gamedata', gamedata);
    updateLogFile('playersDetail', playersDetail);
    cb(gamedata.teams);
};
const initApp = () => {
    consoleLog('~ ~ ~ ~ ~ ~ ~ ~');
    consoleLog('~ ~ ~ ~ ~ ~ ~ ~');
    consoleLog('~ ~ ~ ~ ~ ~ ~ ~');
    consoleLog('~ ~ ~ ~ ~ ~ ~ ~');
    consoleLog('~ ~ ~ ~ ~ ~ ~ ~ initApp');
    gamedata = processData(require('./data/gamedata.json'));
    clearLogs();
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
//        console.log(`socket connected with role ${socket.customData.role} ${socket.id}`);
        pageTypeAdded(socket.customData.role);
//        if () {}
    });
    socket.on('addNewPlayer', (o, callback) => {
//        console.log('addNewPlayer event heard');
        addNewPlayer(o, socket, callback);
    });
    socket.on('getBasicPlayers', (cb) => {
        cb(playersBasic);
    });
    socket.on('getFakePlayers', (cb) => {
        getFakePlayers(cb);
    });
    socket.on('getPlayersDetail', (cb) => {
        updatePlayersDetail();
//        writeLogFile('thedetailasrequested', playersDetail);
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
        getPlayerPack(cb, socket);
    });
    socket.on('getPlayer', (id, cb) => {
        getPlayer(id, cb);
    });
    socket.on('updateSession', () => {
//        console.log('onUpdateSession');
        io.emit('onUpdateSession');
    });
    socket.on('getSession', (cb) => {
        getSession(cb);
    });
    socket.on('requestSession', (id) => {
//        console.log(`request session with ID ${id}`);
        requestSession(id);
    });
    socket.on('adminTerminateSession', () => {
        terminateSession();
    });
    socket.on('setMaxVotes', (m) => {
        setMaxVotes(m);
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
//        console.log(`disconnect event`);
//        console.log(disconnectedPlayer);
        if (disconnectedPlayer) {
            if (disconnectedPlayer.hasOwnProperty('customData')) {
                if (disconnectedPlayer.customData.hasOwnProperty('id')) {
                    // Perform any actions required for the disconnected player
                    playersDetail[disconnectedPlayer.customData.id].handleDisconnect();
                    onPlayersUpdate();
//                    console.log(`disconnect!!!!!!!!!!`);
                } else {
//                    console.log('customData found but has no ID property');
                }
            } else {
//                console.log('no customData found');
            }
        } else {
//            console.log('no player found for disconnect');
        }
//        console.log(`disconnect: ${disconnectedPlayer}`);
    });
    socket.on('requestGameData', (cb) => {
        getGameData(cb);
    });
    socket.on('previewTeams', (cb) => {
        previewTeams(cb);
    });
    socket.on('assignTeams', (cb) => {
        assignTeams(cb);
    });
    socket.on('testEvent', (msg) => {
        console.log(`testEvent: ${msg}`);
    });
    //
    socket.on('pvStakeholderScore', (o) => {
        pvStakeholderScore(o);
    });
    socket.on('stStakeholderScore', (o) => {
        stStakeholderScore(o);
    });
    socket.on('startRound', (r) => {
        if (session) {
            session.setRound(r);
            io.emit('startRound', r);
            io.emit('sessionUpdate');
        }
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
app.get('/download-session', (req, res) => {
    console.log('go down the route');
    let ob = session;
    const csvWriterInstance = csvWriter({
        path: ob,
        header: [
            { id: 'name', title: 'Name' },
            { id: 'score', title: 'Score' },
        ],
    });

    csvWriterInstance.writeRecords(ob)
        .then(() => {
            res.download(ob, (err) => {
                if (err) {
                    console.error('Error sending CSV:', err);
                }
                // Delete the CSV file after sending
                fs.unlinkSync(ob);
            });
        })
        .catch((error) => {
            console.error('Error writing CSV:', error);
            res.status(500).send('Internal Server Error - route not found');
        });
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
app.get('/fakes', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'fakeplayers.html'));
})

server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    initApp();
});
