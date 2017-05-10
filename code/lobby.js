module.exports = function(host,name){
  
  this.clients = []; //list with clients in the lobby
  this.host = host; //host of the lobby (client object)
  this.name = name; //name of the lobby

  this.maxClients = 2;
  this.teamNumber = 2;
  this.gameMode = "DM"; //DM: Deathmatch

  this.teams = [["Spieler A","Spieler B"],["Spieler C","Spieler D"],["Spieler E","Spieler F"]]; //for debugging

  this.addClient = function(client){ //Add a client to the lobby
    this.clients.push(client);
    client.lobby = this;
    this.sync(); //Synchronize with everyone so they know there is someone new in the lobby
  }

  this.removeClient = function(client){ //Removes a client from the lobby
    var index = this.clients.indexOf(client);
    client.lobby = null;
    this.clients.splice(index,1);
    this.sync(); //Synchronize with everyone so they know there has someone left the game
  }

  this.sync = function(){ //Synchronize the lobby between all players in the lobby
    for(var i=0; i<this.clients.length; i++){
      this.clients[i].socket.emit("lobby",{teams: this.teams, name: this.name});
    }
  }

  this.broadcast = function(msg,data){ //send a message to everyone in the lobby
    for(var i=0; i<this.clients.length; i++){
      this.clients[i].socket.emit(msg,data);
    }
  }

  this.addClient(host); //add the host to the lobby, so he know he is this lobby
}