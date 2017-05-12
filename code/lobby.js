Game = require('./game.js');

module.exports = function(host,name){

  this.clients = []; //list with clients in the lobby
  this.host = host; //host of the lobby (client object)
  this.name = name; //name of the lobby

  this.countdown = 5;
  this.allAreReady = false;

  this.settings = {
    maxClients: 2,
    teamNumber: 1,
    gamemode: "DM",
    equalTeams: false,
    worldSeed: "",
    worldGenerator: "berge"
  }

  this.game = null;

  //this.teams = [["Spieler A","Spieler B"],["Spieler C","Spieler D"],["Spieler E","Spieler F"]]; //for debugging
  this.teams = [[]];

  this.addClient = function(client){ //Add a client to the lobby
    if (this.game != null){
      return false; //if a game is currently running
    }
    if (this.clients.length >= this.settings.maxClients){
      return false; //if the lobby is already full
    }
    this.clients.push(client);
    client.lobby = this;

    this.checkTeams();//reorder teams
    this.sync(); //Synchronize with everyone so they know there is someone new in the lobby
  }

  this.removeClient = function(client){ //Removes a client from the lobby
    var index = this.clients.indexOf(client);
    client.lobby = null;
    this.clients.splice(index,1);

    this.checkTeams(); //reorder teams
    this.sync(); //Synchronize with everyone so they know there has someone left the game

    if(this.clients.length <= 0){
      delete lobbies[this.name]; //remove the lobby if no player is in
    }
  }

  this.checkReady = function(){
    var ready = this.clients.every(function(index){
      return (index.isReady);
    });
    if(ready && this.clients.length >= 1){ //for debugging. In real situation only "> 1"
      if(this.game == null){
        this.game = new Game(this,{gamemode: this.gamemode});
        this.allAreReady = true;
        this.countdown = 5;
      }
    }else{
      this.countdown = 5;
    }
  }

  this.sync = function(){ //Synchronize the lobby between all players in the lobby
    for(var i=0; i<this.clients.length; i++){
      this.clients[i].socket.emit("lobby",this.getSync());
    }
  }

  this.getSync = function(){ //get the data needed for the clients

    //create a 2-Dimensional array with objects for the client!
    var teams = [];
    for(var i=0; i<this.settings.teamNumber; i++){
      teams[i] = [];
    }
    for(var i=0; i<this.clients.length; i++){
      var client = this.clients[i];
      var team = client.team;
      if (team >= this.settings.teamNumber){ //if the team of the player don't exists
        client.team = 0;
        team = 0;
      }
      teams[team].push({name: client.name, ready: client.isReady});
    }

    return {
      teams: teams,
      name: this.name,
      settings: this.settings,
      host: this.host.name
    }
  }

  this.broadcast = function(msg,data){ //send a message to everyone in the lobby
    for(var i=0; i<this.clients.length; i++){
      this.clients[i].socket.emit(msg,data);
    }
  }

  this.checkTeams = function(){ //refreshes the teams array
    this.teams = [];
    for(var i=0; i<this.settings.teamNumber; i++){
      this.teams[i] = [];
    }
    for(var i=0; i<this.clients.length; i++){
      var client = this.clients[i];
      var team = client.team;
      if (team >= this.settings.teamNumber){ //if the team of the player don't exists
        client.team = 0;
        team = 0;
      }
      this.teams[team].push(client);
    }
  }

  this.changeSettings = function(data){ //when the host change settings
    if (typeof data !== typeof {}){
      return false;
    }
    var that = this;
    var checkers = { //functions to check that values are in the right range
      teamNumber: function(data){data=Math.min(Math.max(data,1),26); that.settings.teamNumber = data; that.checkTeams(); return data},
      maxClients: function(data){return Math.min(Math.max(data,2),100)}
    }
    if (this.game == null){ //can't change settings in game
      for(var k in data){
        var fun = checkers[k];
        if(fun == undefined){
          this.settings[k] = data[k]
        }else{
          this.settings[k] = fun(data[k]);
        }
      }
      this.sync();
    }
  }

  this.changeTeam = function(client,team){ //change the team of a player
    if(this.game == null){
      client.team = team;
    }
    this.checkTeams();
    this.sync();
  }

  this.addClient(host); //add the host to the lobby, so he know he is this lobby
}