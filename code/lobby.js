module.exports = function(host,name){
  this.clients = [];
  this.host = host;
  this.name = name;
  this.teams = [["Spieler A","Spieler B"],["Spieler C","Spieler D"],["Spieler E","Spieler F"]];
  this.addClient = function(client){ //Add a client to the lobby
    this.clients.push(client);
    client.lobby = this;
    this.sync() //syncronize with everyone so the know there is someone new in the lobby
  }
  this.removeClient = function(client){ //Removes a client from the lobby
    var index = this.clients.indexOf(client);
    this.clients.splice(index,1);
  }
  this.sync = function(){ //syncronize the lobby between all players in the lobby
    for(var i=0; i<this.clients.length; i++){
      this.clients[i].socket.emit("lobby",{teams: this.teams, name: this.name});
    }
  }

  this.addClient(host);
}