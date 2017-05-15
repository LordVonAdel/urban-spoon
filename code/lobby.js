Game = require('./game.js');

module.exports = function(host,name){

  this.clients = []; //list with clients in the lobby
  this.host = host; //host of the lobby (client object)
  this.name = name; //name of the lobby

  this.issues = { //start game only when all issues are false
    emptyTeams: false,
    inGame: false,
    ready: true,
    onePlayer: true
  };

  this.countdown = Infinity;
  this.allAreReady = false;

  this.settings = {
    maxClients: 2,
    teamNumber: 1,
    gamemode: "DM",
    equalTeams: false,
    worldSeed: "",
    worldGenerator: "berge",
    bases: "free"
  };

  this.game = null;

  //this.teams = [["Spieler A","Spieler B"],["Spieler C","Spieler D"],["Spieler E","Spieler F"]]; //for debugging
  this.teams = [[]];

  this.addClient = function(client){ //Add a client to the lobby
    if (this.game != null){
      return "The game is already running!"; //if a game is currently running
    }
    if (this.clients.length >= this.settings.maxClients){
      return "The lobby is full!"; //if the lobby is already full
    }
    if (!this.clients.every(function(element){return (element.name != client.name);})){ //If name is already in use
      return "Someone with this name is already in the lobby!";
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

  this.setInfo = function(text){ //gives the status of the lobby to all players. Errors and things
    this.broadcast('lobbyStatus',text);
  }

  this.reportIssues = function(){
    if(this.clients.length == 1){ //check if more than one player is in the lobby
      this.issues["onePlayer"] = true;
    }else{
      this.issues["onePlayer"] = false;
    }
    var found = false;
    var text = { //text for the clients
      emptyTeams: "Empty teams are not allowed!",
      onePlayer: "A round with only one player is stupid!"
    }
    var html = "";
    for(var i in this.issues){ //itterate through every issue
      if(this.issues[i] == true){
        found = true;
        var txt = text[i];
        if(txt != undefined){
          html += "<br>"+text[i];
        }
      }
    }
    this.setInfo(html);

    return found;

  }

  this.checkReady = function(){
    var ready = this.clients.every(function(index){
      return (index.isReady);
    });
    if(ready){
      this.issues["ready"] = false;
      if (!this.reportIssues()){
        this.countdown = 5;
      }
    }else{
      this.issues["ready"] = true;
      this.countdown = Infinity;
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

  this.broadcast = function(msg,data){ //sends a message to everyone in the lobby
    for(var i=0; i<this.clients.length; i++){
      this.clients[i].socket.emit(msg,data);
    }
  }

  this.broadcastTeam = function(msg,data,team){ //sends a message to everyone in the lobby in specific team
    for(var i=0; i<this.clients.length; i++){
      var cl = this.clients[i];
      if (cl.team == team){
        cl.socket.emit(msg,data);
      }
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
    if (this.teams.some(t => t.length == 0)){
      this.issues.emptyTeams = true;
      return false;
    }
    this.issues.emptyTeams = false;
    return true;
  }

  this.second = function(){ //called every second
    if (this.countdown != Infinity){
      this.countdown --;
      if (this.reportIssues()){
        countdown = Infinity;
      }else{
        this.setInfo("Game starts in "+this.countdown);
      }
      if(this.countdown <= 0){
        this.startGame();
      }
    }
  }

  this.startGame = function(){ //starts the game
    var issueIsFound = this.reportIssues();
    if (issueIsFound){
      this.countdown = Infinity;
    }else{
      this.game = new Game(this);
      this.issues.inGame = true;
    }
  }

  this.changeSettings = function(data){ //when the host change settings
    if (typeof data !== typeof {}){
      return false;
    }
    var that = this;
    var checkers = { //functions to check that values are in the right range
      teamNumber: function(data){data=Math.min(Math.max(data,1),26); that.settings.teamNumber = data; that.checkTeams(); return data;},
      maxClients: function(data){return Math.min(Math.max(data,2),100);},
      bases: function(data){if (["free","auto","none"].indexOf(data) == -1){return "free";}else{return data;}}
    }
    if (this.game == null){ //can't change settings in game
      for(var k in data){
        var fun = checkers[k];
        if(fun == undefined){
          this.settings[k] = data[k];
        }else{
          this.settings[k] = fun(data[k]);
        }
      }
      this.sync();
    }
  }

  this.changeTeam = function(client,team){ //change the team of a player
    if (this.game == null){
      if (team <= this.settings.teamNumber && team >= 0){
        client.team = team;
        this.checkTeams();
        this.sync();
      }
    }
  }

  this.addClient(host); //add the host to the lobby, so he know he is in this lobby
}