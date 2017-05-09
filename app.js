var express = require('express');
app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

server.listen(4217);

app.use(express.static('game'));

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

io.on('connection', function (socket) {
  socket.on('login',function(data){
    console.log("Player: "+data.name+" connected into lobby: "+data.lobby);
  });
});