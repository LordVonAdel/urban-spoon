//Game controls the game actions. What player is next and how projectiles fly and this stuff
World = require('./world.js');

module.exports = function(lobby, settings){
  this.lobby = lobby;
  this.settings = settings; //gamemode, and other stuff
  console.log("Start Game from lobby "+this.lobby.name);
  this.lobby.broadcast("start",{});
  this.world = new World(lobby.settings.worldSeed,lobby.settings.worldGenerator);
  this.lobby.broadcast('world',{
    nodes: this.world.terrain.nodes
  })
}