const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

let master = null;
const servants = new Map();
let int = null;
const waitForMaster = () => {
    if (master !== null) {
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
    socket.on('methodReady', (id) => {
        console.log(`methodReady: ${id}`)
    });
    socket.on('nowIAmTheMaster', () => {
        master = socket.id;
        io.emit('masterConnected', master);
    });
    socket.on('addNewServant', (id, callback) => {
        servants.set(id, socket);
        if (master === null) {
            //
        } else {
            io.emit('newServant', id);
        }
        if (callback) {
            if (typeof(callback) === 'function') {
                callback({master: master})
            }
        }
    });
    const removal = () => {
        console.log('removal');
        // Remove the player ID from the 'players' map upon disconnection
        for (const [servantId, servantSocket] of servants.entries()) {
            if (servantSocket === socket) {
                servants.delete(servantId);
                break;
            }
        }
        console.log(`call getServants`);
        socket.emit('getServants');
        console.log(`called getServants`);
    }
    socket.on('remove', () => {
        removal();
    });
    socket.on('disconnect', () => {
        console.log('disconnect');
        removal();
    });
    socket.on('getServants', () => {
        // Send the list of player IDs to the requesting client
        console.log('get em');
        const servantIds = Array.from(servants.keys());
        socket.emit('onGetServants', servantIds);
    });
    socket.on('playerPing', (id) => {
        const targ = servants.get(id);
        if (targ) {
            targ.emit('ping');
        }
    });
    socket.on('playerReset', (id) => {
        const targ = servants.get(id);
        if (targ) {
            targ.emit('reset');
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
