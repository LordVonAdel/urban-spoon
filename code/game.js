//Game controls the game actions. What player is next and how projectiles fly and this stuff
World = require('./world.js');

module.exports = function(lobby){
  this.nextEntId = 0;
  this.lobby = lobby;
  this.settings = this.lobby.settings; //gamemode, and other stuff
  this.ents =  [];
  console.log("Start Game from lobby "+this.lobby.name);
  this.lobby.broadcast("start",{});
  this.world = new World(lobby.settings.worldSeed,lobby.settings.worldGenerator);
  this.world.sync(this.lobby);

  this.place = function(client,x,y,type){
    var preset = buildings[type];
    this.world.terrain.setYRegion(x-preset.width/2,x+preset.width/2,this.world.terrain.getY(x));
    this.ents[this.nextEntId] = new Building(x,this.world.terrain.getY(x),type,client.team,this.nextEntId);
    this.world.sync(this.lobby);
    if (preset.unique){
      this.lobby.broadcastTeam('placement',null,client.team);
    }
    this.lobby.broadcast('build',{x: x, y: this.world.terrain.getY(x), sprite: preset.sprite, id: this.nextEntId, team: client.team});
    this.nextEntId += 1;
  }

  if (this.settings.bases == "auto"){
    //auto place bases
    var b = ((this.world.terrain.length * this.world.terrain.ppn) / this.lobby.teams.length);
    for(var i=0; i<this.lobby.teams.length; i++){
      this.place(this.lobby.teams[i][0], b*i+b/2,0,"base");
    }
  }else{
    if (this.settings.bases == "free"){ //let the user place the base
      this.lobby.broadcast('placement',{sprite: "sprites/base.png", type: "base", text: "Place the base for your team!"})
    }else{
      //no bases
    }
  }
}

function Building(x,y,type,team,id){
  if (buildings[type] == undefined){
    console.log("Unknown building: "+type);
    return false;
  }
  this.team = team;
  this.x = x;
  this.y = y;
  this.type = type;
  this.id = id;
  var preset = buildings[type];
  this.width = preset.width;
  this.hp = preset.health;

}

buildings = {
  base: {
    width: 128,
    name: "Base",
    sprite: "sprites/base.png",
    unique: true,
    health: 500
  }
}