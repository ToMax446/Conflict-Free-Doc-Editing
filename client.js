class Client {
    constructor(id, port, string, peers, string_operations) {
        this.id = id;
        this.port = port;
        this.string = string;
        this.peers = peers;
        this.string_operations = string_operations;
        this.sockets = [];
    }
}

class Peer {
    constructor(id, host, port) {
        this.id = id;
        this.host = host;
        this.port = port;
    }
}

class Message {
    constructor(from, text) {
        this.from = from;
        this.text = text;
    }
}

const net = require('net');
const fs = require('fs');

// File parsing
let file = fs.readFileSync(process.argv[2], 'utf-8').split(/\r?\n/);
file = file.reverse();
let id = parseInt(file.pop());
let port = parseInt(file.pop());
let string = file.pop();
file.pop(); // ""
let peers = [];
while (true) {
    let line = file.pop();
    if (line == "") {
        break;
    }
    let id = parseInt(line.split(" ")[0]);
    let host = line.split(" ")[1];
    let port = parseInt(line.split(" ")[2]);
    let peer = new Peer(id, host, port);
    peers.push(peer);
}
file.pop(); // ""
let string_operations = [];
while (true) {
    let line = file.pop();
    if (line == "") {
        break;
    }
    string_operations.push(line);
}

// Init client
let client = new Client(id, port, string, peers, string_operations);

// The client connects via sockets to other peers with greater id
for (const peer of client.peers) {
    if (peer.id <= client.id) {
        continue;
    }
    let socket = new net.Socket();
    socket.on('data', handle); // what happen when receiving data from the socket
    socket.on('connect', () => {
        console.log('Connection from ::ffff:', socket.localAddress, 'port', socket.localPort);
        client.sockets.push(socket); // add peer socket to the pool of the client sockets
        if (client.sockets.length == peers.length) {
            eventLoop();
        }
    }); // what happen when socket connection is successfully established
    socket.on('error', (e) => {
        if (e.code === 'ECONNREFUSED') {
            console.log(`Connection ECONNREFUSED from Client ${client.id} to Peer ${peer.id}.`);
            setTimeout(() => {
                socket.connect(peer.port, peer.host); // try to connect to the peer again
            }, 1000);
        }
    }); // what happen when error occur, handle only when the connection refused
    socket.connect(peer.port, peer.host); // try to connect to the peer
}

// The client generates an http server (as shown in class, here at page 88) in order to accept connections from clients with lower id (if exists)
client.server = net.createServer((socket) => {
    console.log('Connection from', socket.remoteAddress, 'port', socket.remotePort);
    socket.on('data', handle); // what happen when receiving data from the socket
    client.sockets.push(socket); // add peer socket to the pool of the client sockets
    if (client.sockets.length == peers.length) {
        eventLoop();
    }
});
client.server.listen(client.port);

// handle function when receiving new message from the socket (peer)
function handle(buffer) {
    let message = JSON.parse(buffer)
    console.log(`FROM: ${message.from}, TO: ${client.id}, TEXT: ${message.text}`);
}

// Event loop
function eventLoop() {
    for (const socket of client.sockets) {
        let message = new Message(client.id, "Hi");
        let buffer = JSON.stringify(message);
        socket.write(buffer);
    }
}