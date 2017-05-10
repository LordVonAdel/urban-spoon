module.exports = function(socket){
  this.socket = socket;
  this.lobby = null;
  this.disconnect = function(){ //when the player disconnect by timeout or something else
    if(this.lobby != null){
      this.lobby.removeClient(this);
    }
  }
  this.leave = function(){ //when the player leaves the game
    if(this.lobby != null){
      this.lobby.removeClient(this);
    }
  }
}