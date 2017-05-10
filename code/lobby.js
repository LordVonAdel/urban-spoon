module.exports = function(host){
  this.clients = [];
  this.host = host;
  this.addClient = function(client){ //Add a client to the lobby
    this.clients.push(client);
    client.lobby = this;
  }
  this.removeClient = function(client){ //Removes a client from the lobby
    var index = this.clients.indexOf(client);
    this.clients.splice(index,1);
  }

  this.addClient(host);
}