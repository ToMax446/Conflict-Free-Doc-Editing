class Client {
    constructor(id, host, port, string, peers, string_operations) {
        this.id = id;
        this.host = host;
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

let id = 1;
let host = '127.0.0.1';
let string = "";
let port = 65000 + id;
let peers = [
    new Peer(1, '127.0.0.1', 65000 + 1),
    new Peer(2, '127.0.0.1', 65000 + 2),
    new Peer(3, '127.0.0.1', 65000 + 3)
];
let string_operations = ["update", "merge"];

// Init client
let client = new Client(id, host, port, string, peers, string_operations);

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
        if (client.sockets.length == peers.length - 1) {
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
    if (client.sockets.length == peers.length - 1) {
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