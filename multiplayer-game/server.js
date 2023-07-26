const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

let master = null;
//const servants = {};
const servants = new Map();
let int = null;
const waitForMaster = () => {
//    console.log(`waiting for master...`);
    if (master !== null) {
        console.log(`\rmaster found: ${master}`);
        clearInterval(masterTimer);
        clearInterval(int);
    }
}
int = setInterval(waitForMaster, 500);
var masterTimer = (function () {
    var P = ["\\", "|", "/", "-"];
    var x = 0;
    return setInterval(function () {
        process.stdout.write("\rwaiting for master " + P[x++]);
        x &= 3;
    }, 250);
})();
io.on('connection', (socket) => {
    socket.on('init', (type) => {
        if (type === 'master') {
            master = socket.id;
            socket.emit();
        }
    });
    socket.on('addNewServant', (id) => {
        if (int === null) {
//            int = setInterval(waitForMaster, 1000);
        }
        servants.set(id, socket);
        if (master === null) {
//            socket.emit('message', 'waiting for master');
        } else {
//            socket.emit('message', `the master is ${master}`);
            io.emit('newServant', id);
        }
    });
    socket.on('disconnect', () => {
        // Remove the player ID from the 'players' map upon disconnection
        for (const [servantId, servantSocket] of servants.entries()) {
            if (servantSocket === socket) {
                servants.delete(servantId);
                break;
            }
        }
    });
    socket.on('getServants', () => {
        // Send the list of player IDs to the requesting client
        const servantIds = Array.from(servants.keys());
        socket.emit('onGetServants', servantIds);
    });
    socket.on('playerPing', (id) => {
        console.log('ping player ' + id);
        const targ = servants.get(id);
        if (targ) {
            targ.emit('ping');
            console.log('ok to ping');
        } else {
            console.log('cannot ping');
        }
    });
});
io.on('onServantConnect', (socket) => {
    console.log('servant connects')
})

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
