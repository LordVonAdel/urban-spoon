const PORT = 4217;

var express = require('express');
app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var Client = require('./code/client.js');

server.listen(PORT,function(){
  console.log("Server runs on Port "+PORT)
});

app.use(express.static('game'));

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

clients = [];
lobbies = {};

io.on('connection', function (socket) {
  //player connect
  var client = new Client(socket); //create the client instance for the player
  clients.push(client);

  console.log("Connection opened!");
});

secondLoop = function(){

  for(l in lobbies){
    lobbies[l].second();
  }

  setTimeout(secondLoop,1000);
}
secondLoop();