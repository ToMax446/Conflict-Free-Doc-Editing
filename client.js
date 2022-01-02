const net = require('net');
const fs = require('fs');

const LOCAL_UPDATES = 1;
let COUNT_UPDATES = 0;

class Client {
    constructor(id, port, string, peers, string_operations) {
        this.id = id;
        this.port = port;
        this.string = string;
        this.peers = peers;
        this.string_operations = string_operations;
        this.sockets = [];
        this.timestamp = 0;
        this.goodbyes = 0;
    }
}

class Peer {
    constructor(id, host, port) {
        this.id = id;
        this.host = host;
        this.port = port;
    }
}

class Event {
    constructor(timestamp, id, op, orgString, newString) {
        this.timestamp = timestamp;
        this.id = id;
        this.op = op;
        this.orgString = orgString;
        this.newString = newString;
    }
}

const close = () => {
    client.goodbyes = client.goodbyes + 1;
    if (client.goodbyes === client.peers.length + 1) {
        console.log(`Client ${client.id} replica ${client.string}`);
        console.log(`Client ${client.id} is exiting`);
        client.server.close()
        client.sockets.forEach(socket => socket.end())
    }
};

// adding a method to the prototype of string to add at certain index
String.prototype.addAt = function (index, text) {
    return index !== undefined
        ? this.substring(0, index) + text + this.substring(index + text.length + 1)
        : this + text;
};
// adding a method to the prototype of string to add remove at certain index
String.prototype.removeAt = function (index) {
    return this.substring(0, index) + this.substring(index + 1);
};

// File parsing
let file = fs.readFileSync(process.argv[2], 'utf-8').split(/\r?\n/);
file = file.reverse();
let id = parseInt(file.pop());
let port = parseInt(file.pop());
let string = file.pop();
const operationQueue = [];
file.pop(); // ""
let peers = [];
while (true) {
    let line = file.pop();
    if (line === '') {
        break;
    }
    let [id, host, port] = line.split(' ');
    let peer = new Peer(id, host, port);
    console.log(id, host, port);
    peers.push(peer);
}
// file.pop(); // pop takes out the last item but we reversed
file.shift(); // use shift to take the first item
file.shift();
let string_operations = [];
while (file.length !== 0) {
    let line = file.pop();
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
        console.log(
            'Connection from ::ffff:',
            socket.localAddress,
            'port',
            socket.localPort
        );
        client.sockets.push(socket); // add peer socket to the pool of the client sockets
        if (client.sockets.length === peers.length) {
            operationLoop();
        }
    }); // what happen when socket connection is successfully established
    socket.on('error', (e) => {
        if (e.code === 'ECONNREFUSED') {
            console.log(
                `Connection ECONNREFUSED from Client ${client.id} to Peer ${peer.id}.`
            );
            setTimeout(() => {
                socket.connect(peer.port, peer.host); // try to connect to the peer again
            }, 1000);
        }
    }); // what happen when error occur, handle only when the connection refused
    socket.connect(peer.port, peer.host); // try to connect to the peer
}

// The client generates an http server (as shown in class, here at page 88) in order to accept connections from clients with lower id (if exists)
client.server = net.createServer((socket) => {
    console.log(
        'Connection from',
        socket.remoteAddress,
        'port',
        socket.remotePort
    );
    socket.on('data', handle); // what happen when receiving data from the socket

    client.sockets.push(socket); // add peer socket to the pool of the client sockets
    if (client.sockets.length === peers.length) {
        operationLoop();
    }
});
client.server.listen(client.port);

// handle function when receiving new message from the socket (peer)
function handle(buffer) {
    // let message = JSON.parse(buffer);
    const event = JSON.parse(buffer);
    if (event === "goodbye") {
        close();
        return;
    }
    console.log(`Client ${client.id} received an update operation <${event.op}, ${event.timestamp}> from client ${event.id}`);
    client.timestamp = Math.max(event.timestamp, client.timestamp) + 1;
    operationQueue.push(event);
    operationQueue.sort((firstEl, secondEl) => {
        // make sure storage is sorted by ts
        // sort the array by timestamp
        const ans = firstEl.timestamp - secondEl.timestamp;
        return ans === 0 ? firstEl.id - secondEl.id : ans;
    });
    const [_, ...rest] = operationQueue;
    if ((new Set(rest.map((e2) => e2.id).filter(id => id !== client.id)).size === client.peers.length)) {
        const event1 = operationQueue.shift();
        console.log(`Client ${client.id} removed operation  <${event1.op},  ${event1.timestamp}> from storage`);
    }
    console.log(`Client ${client.id} started merging, from ${client.timestamp} time stamp, on ${client.string}`);
    const index = operationQueue.indexOf(event);
    // client.string = index === 0 ? (operationQueue.length > 0 : operationQueue[index - 1].string) : operationQueue[index - 1].string; // index 0
    if (index === 0) {
        client.string = operationQueue.length > 1 ? operationQueue[1].orgString : client.string;
    } else {
        client.string = operationQueue[index - 1].newString;
    }
    for (const event of operationQueue.slice(index)) {
        event.orgString = client.string;
        if (event.op.includes("insert")) {
            const [_, char, index] = event.op.split(' '); // if no index was given it will be undefined
            if (index) {
                client.string = client.string.substring(0, parseInt(index)) + char + client.string.substring(parseInt(index));
            } else {
                client.string = client.string + char;
            }
        } else {
            const [_, index] = event.op.split(' ');
            client.string = client.string.substring(0, parseInt(index)) + client.string.substring(parseInt(index) + 1);
        }
        event.newString = client.string;
        console.log(`operation <${event.op}, ${event.timestamp}>, string: ${event.newString}`);
    }
    console.log(`Client ${client.id} ended merging with string ${client.string}, on timestamp ${client.timestamp}`);
    console.log();
}

function operationLoop() {
    if (string_operations.length > 0) {
        const operation = client.string_operations.shift();
        // const [op, char, index] = operation.split(' '); // if no index was given it will be undefined
        setImmediate(() => {
            client.timestamp = client.timestamp + 1;
            const event = new Event(client.timestamp, client.id, operation);
            COUNT_UPDATES = COUNT_UPDATES + 1;
            if (COUNT_UPDATES === LOCAL_UPDATES) {
                COUNT_UPDATES = 0;
                for (const socket of client.sockets) socket.write(JSON.stringify(event));
            }
            // client.string = op === 'insert' ? client.string.addAt(index, char) : client.string.removeAt(index);
            // event.string = client.string; // updated string
            // operationQueue.push(event);
            // operationQueue.sort((firstEl, secondEl) => {
            //     // make sure storage is sorted by ts
            //     // sort the array by timestamp
            //     const ans = firstEl.timestamp - secondEl.timestamp;
            //     return ans === 0 ? firstEl.id - secondEl.id : ans;
            // });
            handle(JSON.stringify(event));
        });
        setTimeout(() => operationLoop(), 1000);
    } else {
        console.log(`Client ${client.id} finished his local string modifications`);
        close();
        for (const socket of client.sockets) socket.write(JSON.stringify("goodbye"));
    }
}
