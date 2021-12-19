const net = require('net');

const server = net.createServer((socket) => {
    console.log('Connection from', socket.remoteAddress, 'port', socket.remotePort);

    socket.on('data', (buffer) => {
        // console.log('Request from', socket.remoteAddress, 'port', socket.remotePort);
        console.log(`Server 1 get: ${buffer.toString()}`);
        socket.write(`${buffer.toString('utf-8').toUpperCase()}\n`);
    });
    console.log("Check\n");
    socket.on('end', () => {
        console.log('Closed', socket.remoteAddress, 'port', socket.remotePort);
    });
});

server.maxConnections = 20;
server.listen(59898);