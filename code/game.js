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

  this.place = function(client,x,y,type){ //place an entity in the world and synchronise it with everyone in this lobby
    var preset = entities[type];
    if (preset.flat){
      this.world.terrain.setYRegion(x-preset.width/2,x+preset.width/2,this.world.terrain.getY(x)); //flat the ground under the ent
      this.world.sync(this.lobby);
    }
    this.ents[this.nextEntId] = new Entity(x,this.world.terrain.getY(x),type,client.team,this.nextEntId,this);
    if (preset.unique){
      this.lobby.broadcastTeam('placement',null,client.team);
      //if the ent is unique send to the team members they don't need to place it because it already was placed
    }
    this.lobby.broadcast('build',{x: x, y: this.world.terrain.getY(x), sprite: preset.sprite, id: this.nextEntId, team: client.team, hp: preset.health, hpMax: preset.health});
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

function Entity(x,y,type,team,id,game){
  if (entities[type] == undefined){
    console.log("Unknown entity: "+type);
    return false;
  }
  this.team = team;
  this.x = x;
  this.y = y;
  this.type = type;
  this.id = id;
  this.game = game;
  var preset = entities[type];
  this.width = preset.width;
  this.hp = preset.health;
  this.event = function(event,data){
    if (preset.events != undefined){
      var ev = preset.events[event];
      if (ev != undefined){
        ev(this,data);
      }
    }
  }
  this.event("spawn");
  this.sync = function(){ //send array with entity information for synchronisation
    this.game.lobby.broadcast(1,[this.id,this.x,this.y,this.hp]);
  }
}

entities = {
  base: {
    width: 128,
    name: "Base",
    sprite: "sprites/base.png",
    unique: true,
    flat: true,
    health: 500,
    events: { 
      spawn: function(ent){
        ent.game.place({team: ent.team},ent.x+128,ent.y,"vehicle");
      }
    }
  },
  vehicle: {
    width: 64,
    name: "Vehicle",
    sprite: "sprites/vehicleBase.png",
    health: 80
  }
}