var express = require('express');
app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var Client = require('./code/client.js');

config = require('./config.json');

server.listen(config.port,function(){
  console.log("Server runs on Port "+config.port)
});

app.use(express.static('client'));

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});
app.get('/lobbies', function(req, res){
  var obj = {lobbies:[]};
  for (k in lobbies){
    var lobby = lobbies[k];
    if (lobby.settings.public){
      obj.lobbies.push({name: lobby.name, players: lobby.clients.length, playersMax: lobby.settings.maxClients});
    }
  }

  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(obj));
});

clients = [];
lobbies = {};

io.on('connection', function (socket) {
  //player connect
  var client = new Client(socket); //create the client instance for the player
  clients.push(client);

  //console.log("Connection opened!");
});

secondLoop = function(){
  for(l in lobbies){
    lobbies[l].second();
  }
  setTimeout(secondLoop,1000);
}
tickLoop = function(){
  for(l in lobbies){
    lobbies[l].tick();
  }
  setTimeout(tickLoop,1000/60);
}
secondLoop();
tickLoop();