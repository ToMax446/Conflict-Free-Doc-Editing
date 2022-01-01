const net = require('net');
const fs = require('fs');

const LOCAL_UPDATES = 1;

class Client {
	constructor(id, port, string, peers, string_operations) {
		this.id = id;
		this.port = port;
		this.string = string;
		this.oldString = string;
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

class Message {
	constructor(from, text) {
		this.from = from;
		this.text = text;
	}
}

class Event {
	constructor(timestamp, op, index, str) {
		this.timestamp = timestamp;
		this.op = op;
		this.index = index;
		this.str = str;
	}
}
const sleep = async function (ms) {
	await new Promise((resolve) => setTimeout(resolve, ms));
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
close = () => {
	if (client.goodbyes < peers.length) client.goodbyes++;
	else {
		console.log(string);
		client.server.unref();
	}
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
	// let id = parseInt(splitLine[0]);
	// let host = line.split(' ')[1];
	// let port = parseInt(line.split(' ')[2]);
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
	// while (true) {
	let line = file.pop();
	// 	if (line === '') {
	// 		break;
	// 	}
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
			eventLoop();
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
const updateEvent = (event) => {
	// sets timestamps and pushes the event to the storage
	timestamp = Math.max(event.timestamp, this.timestamp) + 1;
	event.timestamp = this.timestamp;
	operationQueue.push(event);
	operationQueue.sort((firstEl, secondEl) => {
		// make sure storage is sorted by ts
		// sort the array by timestamp
		firstEl[0] - secondEl[0];
	});
};
const sendEvent = (event) => {
	// emits the event to all peers through their sockets
	for (const socket of client.sockets) socket.emit(event);
};

// The client generates an http server (as shown in class, here at page 88) in order to accept connections from clients with lower id (if exists)
client.server = net.createServer((socket) => {
	console.log(
		'Connection from',
		socket.remoteAddress,
		'port',
		socket.remotePort
	);
	socket.on('data', handle); // what happen when receiving data from the socket
	socket.on('goodbye', close);

	// Listen to updateString events
	// //prettier-ignore
	// socket.on('updateEvent', insertOp);
	// socket.on('deleteOp', deleteOp);

	client.sockets.push(socket); // add peer socket to the pool of the client sockets
	if (client.sockets.length === peers.length) {
		eventLoop();
	}
});
client.server.listen(client.port);
const applyModification = (op, index, str) => {
	string = op === 'insert' ? string.addAt(index, str) : string.removeAt(index);
};
// handle function when receiving new message from the socket (peer)
function handle(buffer) {
	let message = JSON.parse(buffer);
	console.log(`Client ${client.id} ${message.text}`);
}
// FIX TODO BUG logging done wrong
// const sendOpMessage = (op, timestamp) => {
// 	let message = new Message(
// 		client.id,
// 		`recieved an update operation ${op}, ${timestamp} from client ${client.id}`
// 	);
// 	let buffer = JSON.stringify(message);
// 	socket.write(buffer);
// };
// const sendStartMergeMessage = (op, timestamp) => {
// 	let message = new Message(
// 		client.id,
// 		`started merging, from ${timestamp} timestamp on ${client.string}`
// 	);
// 	let buffer = JSON.stringify(message);
// 	socket.write(buffer);
// };
// const sendEndMergeMessage = (op, timestamp) => {
// 	let message = new Message(
// 		client.id,
// 		`ended merging with string ${client.string}, on timestamp ${timestamp}`
// 	);
// 	let buffer = JSON.stringify(message);
// 	socket.write(buffer);
// };
// const sendRemoveMessage = (op, timestamp) => {
// 	let message = new Message(
// 		client.id,
// 		`removed operation ${op},${timestamp} from storage`
// 	);
// 	let buffer = JSON.stringify(message);
// 	socket.write(buffer);
// };
// const sendFinishedMessage = (timestamp) => {
// 	let message = new Message(
// 		client.id,
// 		`finished his local string modifications`
// 	);
// 	let buffer = JSON.stringify(message);
// 	socket.write(buffer);
// };
// const sendFinishedMessage = (timestamp) => {
// 	let message = new Message(
// 		client.id,
// 		`finished his local string modifications`
// 	);
// 	let buffer = JSON.stringify(message);
// 	socket.write(buffer);
// };
// const insertOp = (timestamp, index, str) => {
// 	// string = string.addAt(index, str);
// };
// const deleteOp = (timestamp, index) => {
// 	// string = string.addAt(index, str);
// 	operationQueue.push((timestamp, index, undefined, 'delete'));
// 	operationQueue.sort((firstEl, secondEl) => {
// 		// sort the array by timestamp
// 		firstEl[0] - secondEl[0];
// 	});
// 	operationQueue.push((timestamp, index));
// };

for (const opString of string_operations) {
	// goes through the string_operations and adds a task to the microtasks queue at the event loop
	const [op, str, index] = opString.split(' '); // if no index was given it will be undefined
	// new proto methods can handle index===undefined
	setImmediate(() => {
		applyModification(op, index, str);
		const event = new Event(client.timestamp, op, index, str);
		updateEvent(event);
		sendEvent(event);
	});
	//as said in assignment "wait some time" after adding the task to the queue
	//need to wrap below statement in async function
	sleep(500); // check if this works
}
// Event loop
function eventLoop() {
	for (const socket of client.sockets) {
		// emit (send) an event on the socket with the current timestamp and new string
	}
}
