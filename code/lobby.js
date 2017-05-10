module.exports = function(){
  this.clients = [];
  this.addClient = function(client){
    this.clients.push(client);
  }
}