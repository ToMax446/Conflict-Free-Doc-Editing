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

let id = 2;
let host = '127.0.0.1';
let string = "";
let port = 65000 + id;
let peers = [
    new Peer(1, '127.0.0.1', 65000 + 1),
    new Peer(3, '127.0.0.1', 65000 + 3)
];
let string_operations = ["update", "merge"];

// init client
let client = new Client(id, host, port, string, peers, string_operations);

// The client connects via socket to clients with greater id
for (const peer of client.peers) {
    if (peer.id < client.id) {
        continue;
    }
    let socket = new net.Socket();
    client.sockets.push(socket);
    socket.on('data', handle);
    socket.on('error', (e) => {
        if (e.code === 'ECONNREFUSED') {
            console.log(`Connection ECONNREFUSED from Client ${client.id} to Peer ${peer.id}.`);
            setTimeout(() => {
                socket.connect(peer.port, peer.host);
            }, 3000);
        }
    });
    socket.connect(peer.port, peer.host);
}

// The client generates an http server (as shown in class, here at page 88) in order to accept connections from clients with lower id (if exists)
client.server = net.createServer((socket) => {
    console.log('Connection from', socket.remoteAddress, 'port', socket.remotePort);
    client.sockets.push(socket);
    socket.on('data', handle);
});
client.server.listen(client.port);

// handle function when receiving new message from the socket (peer)
function handle(buffer) {
    let message = JSON.parse(buffer)
    console.log(`FROM: ${message.from}, TO: ${client.id}, TEXT: ${message.text}`);
}

// Event loop
setTimeout(() => {
    for (const socket of client.sockets) {
        let message = new Message(client.id, "Hi");
        let buffer = JSON.stringify(message);
        socket.write(buffer);
    }
}, 10000); //run this after 3 seconds