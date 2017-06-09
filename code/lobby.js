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
    teamNumber: 2,
    worldGenerator: "berge",
    worldSize: 2000,
    bases: "free",
    friendlyFire: 1,
    public: false,
    maxUnitsPerTeam: 6,
    startEnergy: 500,
    goal: "bases"
  };

  this.game = null;

  //this.teams = [{clients: ["Spieler A","Spieler B"], score:0},[clients: ["Spieler C","Spieler D"], score: 0},{clients: ["Spieler E","Spieler F"], score: 0}]; //for debugging
  this.teams = [{clients:[]}];

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

    if (this.game){
      this.game.teamUpdate();
    }
  }

  this.setInfo = function(text){ //gives the status of the lobby to all players. Errors and things
    this.broadcast('lobbyStatus',text);
  }

  this.reportIssues = function(){
    this.checkReady();
    if(this.clients.length == 1){ //check if more than one player is in the lobby
      this.issues["onePlayer"] = true;
    }else{
      this.issues["onePlayer"] = false;
    }
    var found = false;
    var text = { //text for the clients
      emptyTeams: "Empty teams are not allowed!",
      onePlayer: "A round with only one player is stupid!",
      ready: "Not everyone is ready yet!"
    }
    var html = "";
    var info = [];
    for(var i in this.issues){ //itterate through every issue
      if(this.issues[i] == true){
        found = true;
        var txt = text[i];
        if(txt != undefined){
          info.push({type: "error", msg: text[i]});
          html += "<br>"+text[i];
        }
      }
    }
    this.setInfo(info);

    if (found == false){
     if (this.countdown == Infinity){
        this.countdown = config.lobbyCooldown;
      }
    }else{
      this.countdown = Infinity;
    }

    return found;
  }

  this.checkReady = function(){
    var ready = this.clients.every(function(index){
      return (index.isReady);
    });
    if(ready){
      this.issues["ready"] = false;
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
      this.teams[i] = {clients:[]};
    }
    for(var i=0; i<this.clients.length; i++){
      var client = this.clients[i];
      var team = client.team;
      if (team >= this.settings.teamNumber){ //if the team of the player don't exists
        client.team = 0;
        team = 0;
      }
      this.teams[team].clients.push(client);
    }
    if (this.teams.some(t => t.clients.length == 0)){
      this.issues.emptyTeams = true;
      return false;
    }
    this.issues.emptyTeams = false;
    return true;
  }

  this.getTeam = function(teamIndex){
    return this.teams[teamIndex];
  }

  this.second = function(){ //called every second
    if (this.countdown != Infinity){
      this.countdown --;
      if (this.reportIssues()){
        countdown = Infinity;
      }else{
        this.setInfo([{type:"info", msg: "Game starts in "+this.countdown}]);
      }
      if(this.countdown <= 0){
        this.startGame();
      }
    }
    if (this.game != null){
      this.game.second();
    }else{
      this.reportIssues();
    }
  }

  this.tick = function(){ //called every tick from the tickloop in app.js
    if (this.game != null){
      this.game.tick();
    }
  }

  this.startGame = function(){ //starts the game
    var issueIsFound = this.reportIssues();
    if (issueIsFound){
      this.countdown = Infinity;
    }else{
      this.game = new Game(this);
      this.issues.inGame = true;
      this.clients.forEach(function(client){
        client.isReady = false;
      });
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
      bases: function(data){if (["free","auto","none"].indexOf(data) == -1){return "free";}else{return data;}},
      worldGenerator: function(data){if (["berge","random","flat","gauss"].indexOf(data) == -1){return "berge";}else{return data;}},
      worldSize: function(data){return Math.min(Math.max(data,100),2000)},
      goal: function(data){if (["bases","all","energy10000"].indexOf(data) == -1){return "bases";}else{return data;}},
      friendyFire: function(data){return Math.min(Math.max(data,0),10)},
      public: function(data){if (typeof data != typeof true){return false}; return data;},
      maxUnitsPerTeam: function(data){return Math.max(1,data)},
      startEnergy: function(data){return Math.max(100,Math.min(1000,data))},
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