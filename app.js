var express = require('express');
app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var Client = require('./code/client.js');

server.listen(4217);

app.use(express.static('game'));

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

clients = [];

io.on('connection', function (socket) {
  clients.push(new Client(socket));
  socket.on('login',function(data){
    console.log("Player: "+data.name+" connected into lobby: "+data.lobby);
  });
});