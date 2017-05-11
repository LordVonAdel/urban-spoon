module.exports = function(socket,name){
  this.socket = socket;
  this.lobby = null;
  this.isReady = false;
  this.team = 0;
  this.name = "";

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