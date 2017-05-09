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
  console.log("Spieler ist verbunden!");
  socket.emit(0, "HEY!!!!!!!!!!!");

  socket.on(1, function(data) {
    console.log(data);
    socket.emit(0, "HEY!!!!!!!!!!!");
  });
});