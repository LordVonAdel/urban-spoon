module.exports = function(socket){
  this.socket = socket;
  this.lobby = null;
  this.isReady = false;

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
    }
  }
}