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

io.on('connection', (socket) => {
    console.log('New player connected:', socket.id);
    socket.on('init', (type) => {
        console.log(`init type ${type}`);
//        socket.emit('onServantConnect', socket.id);
        if (type === 'master') {
            master = socket.id;
        }
        if (type === 'servant') {
            if (master === null) {
                console.log(`cannot connect servant, no master assigned`);
                socket.emit('message', 'cannot connect servant, no master assigned');
            } else {
                socket.emit('message', `the master is ${master}`);
                socket.emit('message', `I am ${socket.id}`);
                io.emit('onServantConnect', socket.id);
            }
        }
    });
    socket.on('addNewServant', (id) => {
//        console.log('addNewServant', id);
//        servants[id] = {id: id};
        servants.set(id, socket);
        console.log(servants);
        io.emit('newServant', servants.size);
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
