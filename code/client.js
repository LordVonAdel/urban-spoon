var Lobby = require('./lobby.js');

module.exports = function(socket,name){
  this.socket = socket;
  this.lobby = null;
  this.isReady = false;
  this.team = 0;
  this.name = "";
  var client = this;

  socket.on('login',function(data){
    if(typeof data !== typeof {}){
      return false;
    }
    data.name = client.saveString(data.name);
    data.lobby = client.saveString(data.lobby);
    if(client.lobby == null && data.name && data.lobby){  //if player is not in a lobby and has the player give a name / lobby
      client.name = data.name;
      //console.log("Player: "+data.name+" connected into lobby: "+data.lobby);
      if(lobbies[data.lobby] == undefined){ 
        lobbies[data.lobby] = new Lobby(client,data.lobby); //if the lobby does not exists create a new one and set the player as the host
      }else{
        var err = lobbies[data.lobby].addClient(client); //else add the player to the existing lobby
        if (err){
          client.socket.emit('loginError',err);
        }
      }
    }
  });
  socket.on('leave',function(){
    client.leave();
    socket.emit('leave'); //when the player leaves say him he left
  });
  socket.on('disconnect',function(){
    client.disconnect(); //removes the player from the current lobby and other stuff
  });
  socket.on('ready',function(data){
    if (typeof data !== typeof true){
      return false;
    }
    client.setReady(data);
  });
  socket.on('lobbySetting',function(data){
    if(client.lobby != null){
      if(client.lobby.host == client){
        client.lobby.changeSettings(data);
      }
    }
  });
  socket.on('changeTeam',function(data){
    if (typeof data !== typeof 1){
      return false;
    }
    if (client.lobby != null){
      client.lobby.changeTeam(client,data);
    }
  });
  socket.on('place',function(data){
    if(client.lobby != null){
      if(client.lobby.game != false){
        client.lobby.game.place(client,data.x,data.y,data.type);
      }
    }
  });

  this.disconnect = function(){ //when the player disconnect by timeout or something else
    if(this.lobby != null){
      this.lobby.removeClient(this);
    }
  }

  this.leave = function(){ //when the player leaves the game
    if(this.lobby != null){
      this.lobby.removeClient(this);
    }
    this.isReady = false;
  }

  this.setReady = function(status){
    this.isReady = status;
    if (this.lobby != null){
      this.lobby.checkReady();
      this.lobby.sync();
    }
  }

  this.saveString = function(str){ //a function to remove characters like "<" or ">" for saefty reasons
    str = str.replace(/>/g, '&gt');
    str = str.replace(/</g, '&lt');
    return str;
  }

}