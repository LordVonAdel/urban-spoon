var express = require('express');
app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var Client = require('./code/client.js');
var Lobby = require('./code/lobby.js');

server.listen(4217);

app.use(express.static('game'));

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

clients = [];
lobbies = [];

io.on('connection', function (socket) {

  var client = new Client(socket);
  clients.push(client);

  socket.on('login',function(data){
    console.log("Player: "+data.name+" connected into lobby: "+data.lobby);
    if(!client.isInLobby){  //if player is not in a lobby
      if(lobbies.indexOf(data.lobby) == undefined){ 
        lobbies.push(new Lobby(client)); //if the lobby does not exists create a new one and set the player as the host
      }else{
        lobbies[data.lobby].addClient(client); //else add the player to the existing lobby
      }
    }
  });
});