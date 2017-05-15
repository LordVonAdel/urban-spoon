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
    this.nextEntId += 1;
    var preset = entities[type];
    if (preset.flat){
      this.world.terrain.setYRegion(x-preset.width/2,x+preset.width/2,this.world.terrain.getY(x)); //flat the ground under the ent
      this.world.sync(this.lobby);
    }
    var ent = new Entity(x,this.world.terrain.getY(x),type,client.team,this.nextEntId,this);
    if (preset.unique){
      this.lobby.broadcastTeam('placement',null,client.team);
      //if the ent is unique send to the team members they don't need to place it because it already was placed
    }
    ent.sync();
  }

  this.playerSelect = function(client,entID){ //when a player selects an entity
    //send him information about the entity back
    var ent = this.ents[entID];
    if (ent == undefined){
      return false;
    }
    client.socket.emit('selDat',ent.getSelectData());
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
  game.ents[id] = this;
  this.team = team;
  this.x = x;
  this.y = y;
  this.type = type;
  this.id = id;
  this.game = game;
  this.angle = 0;
  this.preset = entities[type];
  this.width = this.preset.width;
  this.hp = this.preset.health;
  this.hpMax = this.preset.health;

  this.event = function(event,data){
    if (this.preset.events != undefined){
      var ev = this.preset.events[event];
      if (ev != undefined){
        ev(this,data);
      }
    }
  }

  this.sync = function(){ //send array with entity information for synchronisation
    this.update();
    this.game.lobby.broadcast(1,[this.id,this.x,this.y,this.hp]);
    if (this.preset.angleToGround){
      this.game.lobby.broadcast(2,[this.id,this.angle]);
    }
  }

  this.update = function(){
    if (this.preset.angleToGround){
      this.angle = Math.atan2(this.game.world.terrain.getSlope(this.x),1);
    }
    this.y = this.game.world.terrain.getY(this.x);
  }

  this.getSelectData = function(){
    return {
      name: this.preset.name,
      hp: this.hp,
      hpMax: this.hpMax
    }
  }

  this.game.lobby.broadcast('build',{x: this.x, y: this.y, sprite: this.preset.sprite, id: this.id, team: this.team, hp: this.health, hpMax: this.preset.health, angle: 0})
  this.event("spawn");
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
        ent.game.place({team: ent.team},ent.x+256,ent.y,"vehicle");
      }
    }
  },
  vehicle: {
    width: 64,
    name: "Vehicle",
    sprite: "sprites/vehicleBase.png",
    health: 80,
    angleToGround: true
  }
}