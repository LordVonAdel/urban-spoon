//Game controls the game actions. What player is next and how projectiles fly and this stuff
World = require('./world.js');

module.exports = function(lobby){
  this.nextEntId = 0;
  this.lobby = lobby;
  this.ents = {};
  console.log("Start Game from lobby "+this.lobby.name);
  this.lobby.broadcast("start",{});
  this.world = new World(this.lobby.settings.worldGenerator);
  this.world.sync(this.lobby);

  this.lobby.teams.forEach(function(team){
    team.energy = 100;
    team.unitNumber = 0;
    team.maxUnits = 0;
    team.score = 0;
  });

  this.place = function(team,x,y,type){ //place an entity in the world and synchronise it with everyone in this lobby
    this.nextEntId += 1;
    var preset = entities[type];
    if (preset != undefined){
      var yy = this.world.terrain.getY(x);
      if (preset.flat){
        this.world.terrain.setYRegion(x-preset.width/2,x+preset.width/2,this.world.terrain.getY(x)); //flat the ground under the ent
        this.world.sync(this.lobby);
      }
      if (preset.grounded == false){
        yy = y;
      }
      var ent = new Entity(x,yy,type,team,this.nextEntId,this);
      if (preset.unique){
        this.lobby.broadcastTeam('placement',null,team);
        //if the ent is unique send to the team members they don't need to place it because it already was placed
      }
      var t = this.lobby.teams[team];
      if (preset.unitCosts != undefined){
         t.unitNumber += preset.unitCosts;
      }
      if (preset.unitCapacity != undefined){
         t.maxUnits += preset.unitCapacity;
      }
      this.syncTeams(team);
      ent.sync();
      return ent;
    }else{
      console.error("[Error]Unknown entity: "+type);
    }
  }

  this.getCollisions = function(x,hy){
    var res = [];
    for (var k in this.ents){
      var ent = this.ents[k];
      //hy does nothing yet
      if (x > ent.x - ent.width / 2 && x < ent.x + ent.width / 2){
        res.push(ent);
      }
    }
    return res; //returns array with colliding objects
  }

  this.playerSelect = function(client,entID){ //when a player selects an entity. This function is called at client.js
    //send him information about the entity back
    var ent = this.ents[entID];
    if (ent == undefined){
      return false;
    }
    client.selectedEnt = ent;
    client.socket.emit('selDat',ent.getSelectData(client.team == ent.team));
  }

  this.playerAction = function(client,data){ //when a player clicks on an action. This function is called at client.js too!
    var actionIndex = data.index;
    var extra = data.extra;
    var ent = client.selectedEnt
    if (ent != null){
      if (ent.team == client.team){
        var costs = ent.preset.actions[actionIndex].costs;
        var type = ent.preset.actions[actionIndex].type;
        var team = this.lobby.getTeam(client.team);
        if (type == "vehicle"){
          var preset = entities[ent.preset.actions[actionIndex].ent];
          if (preset != undefined){
            if (team.unitNumber + preset.unitCosts > team.maxUnits){
              return false; //unit limit reached!
            }
          }
        }
        if (team.energy >= costs){
          team.energy -= costs;
          client.selectedEnt.event("a"+actionIndex,extra);
          this.syncTeams(client.team);
        }
      }
    }
  }

  this.syncTeams = function(team){ //sends every player information about their team
    if (team == undefined){
      for(var i=0; i<this.lobby.teams.length; i++){
        var t = this.lobby.teams[i];
        this.lobby.broadcastTeam('t',{energy: t.energy, id: i, units: t.unitNumber, maxUnits: t.maxUnits},i);
      }
    }else{
      var t = this.lobby.teams[team];
      this.lobby.broadcastTeam('t',{energy: t.energy, id: team, units: t.unitNumber, maxUnits: t.maxUnits},team);
    }
  }

  this.tick = function(){ //called every tick from the lobby
    for(var k in this.ents){
      var ent = this.ents[k];
      ent.tick();
    }
  }

  if (this.lobby.settings.bases == "auto"){
    //auto place bases
    var b = ((this.world.terrain.length * this.world.terrain.ppn) / this.lobby.teams.length);
    for(var i=0; i<this.lobby.teams.length; i++){
      this.place(i, b*i+b/2,0,"base");
    }
  }else{
    if (this.lobby.settings.bases == "free"){ //let the user place the base
      this.lobby.broadcast('placement',{sprite: "sprites/base.png", type: "base", text: "Place the base for your team!"});
    }else{
      //no bases
    }
  }

  this.showEffect = function(x,y,sprite,duration){
    this.lobby.broadcast('e',[x,y,sprite,duration]);
  }

  this.syncTeams();

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
  this.speed = 2;

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
    if (this.vspeed != undefined || this.xspeed != undefined){
      this.game.lobby.broadcast(3,[this.id,this.hspeed,this.vspeed]);
    }
    if (this.dx != undefined){
      this.game.lobby.broadcast(4,[this.id,Math.atan2(this.dy,this.dx)]);
    }
  }

  this.update = function(){
    if (this.preset.angleToGround){
      this.angle = Math.atan2(this.game.world.terrain.getSlope(this.x),1);
    }
    if (this.preset.grounded != false){
      this.y = this.game.world.terrain.getY(this.x);
    }
  }

  this.getSelectData = function(ownTeam){
    if (ownTeam){
      return {
        name: this.preset.name,
        hp: this.hp,
        hpMax: this.hpMax,
        options: this.preset.actions
      }
    }else{
      return {
        name: this.preset.name,
        hp: this.hp,
        hpMax: this.hpMax,
        options: []
      }
    }
  }

  this.driveTo = function(x){
    this.targetX = x;
  }

  this.tick = function(){
    var xpre = this.x;
    var ypre = this.y;
    if (this.targetX != undefined){
      if (Math.abs(this.x - this.targetX)>this.speed){
        this.x += Math.sign(this.targetX - this.x)*this.speed;
      }else{
        this.x = this.targetX;
      }
    }
    if (this.vspeed != undefined){
      if (this.preset.gravity != undefined){
        this.vspeed += (this.game.world.gravity * this.preset.gravity);
      }
      this.y -= this.vspeed;
      if (this.y < this.game.world.terrain.getY(this.x)){
        this.event("worldCollision");
        this.vspeed = 0;
        this.hspeed = 0;
      }
    }
    if (this.hspeed != undefined){
      this.x += this.hspeed;
    }
    if (this.x != xpre || this.y != ypre){
      this.sync();
      if (this.x < 0 || this.x > this.game.world.terrain.getWidth()){
        this.destroy();
      }
    }
  }

  this.destroy = function(){
    this.game.lobby.broadcast('x',this.id);
    delete this.game.ents[this.id];

    var team = this.game.lobby.teams[this.team];
    if (this.preset.unitCosts != undefined){
      team.unitNumber -= this.preset.unitCosts;
    }
    if (this.preset.unitCapacity != undefined){
      team.unitCapacity -= this.preset.unitCapacity;
    }
  }

  this.damage = function(damage){
    this.hp -= damage;
    if (this.hp <= 0){
      this.destroy();
      this.game.showEffect("sprites/effectSmoke.png",this.x+this.width/2+10,this.y-2);
      this.game.showEffect("sprites/effectSmoke.png",this.x+this.width/2-10,this.y+2);
      this.game.showEffect("sprites/effectSmoke.png",this.x+this.width/2,this.y-8);
    }else{
      this.sync();
    }
  }

  this.game.lobby.broadcast('build',{x: this.x, y: this.y, sprite: this.preset.sprite, id: this.id, team: this.team, hp: this.health, hpMax: this.preset.health, angle: 0, grounded: this.preset.grounded});
  this.event("spawn");
}

entities = {
  base: {
    type: "building",
    width: 128,
    name: "Base",
    sprite: "sprites/base.png",
    unique: true,
    flat: true,
    health: 500,
    grounded: true,
    unitCapacity: 2,
    events: {
      spawn: function(ent){
        ent.game.place(ent.team,ent.x+256,ent.y,"tank");
      },
      a0: function(ent){
        ent.game.place(ent.team,ent.x,ent.y,"builder");
      },
      a1: function(ent){
        ent.game.place(ent.team,ent.x,ent.y,"tank");
      },
    },
    actions: [
      {
        type: "vehicle",
        costs: 100,
        name: "Builder",
        client: "click",
        ent: "builder"
      },
      {
        type: "vehicle",
        costs: 50,
        name: "Tank",
        client: "click",
        ent: "tank"
      },
      {
        type: "ability",
        costs: 200,
        name: "Shield",
        client: "click"
      }
    ]
  },
  tank: {
    type: "vehicle",
    width: 64,
    name: "Tank",
    sprite: ["sprites/vehicleBase.png","sprites/tankCannon.png"],
    health: 80,
    angleToGround: true,
    grounded: true,
    unitCosts: 1,
    events: {
      spawn: function(ent){
        ent.dx = 0; //delta x
        ent.dy = 0; //delta y
      },
      a0: function(ent,data){
        ent.dx = data.dx || 0;
        ent.dy = data.dy || 0;
        ent.sync();
      },
      a1: function(ent){
        var bullet = ent.game.place(ent.team,ent.x,ent.y-1,"bullet");
        bullet.hspeed = (ent.dx / 256)*20;
        bullet.vspeed = (ent.dy / 256)*20;
      },
      a2: function(ent,data){
        if (data.x != undefined){
          ent.driveTo(data.x);
        }
      }
    },
    actions: [
      {
        type: "ability",
        costs: 0,
        name: "Target",
        client: "target" //what the player need to do at the client side
      },
      {
        type: "ability",
        costs: 0,
        name: "Shoot",
        client: "click"
      },
      {
        type: "ability",
        costs: 0,
        name: "Drive",
        client: "drive"
      }
    ]
  },
  bullet: {
    sprite: "sprites/bullet.png",
    grounded: false,
    gravity: 1,
    events: {
      worldCollision: function(ent){
        ent.destroy();
        ent.game.showEffect(ent.x-16,ent.y+16,"sprites/effectSmoke.png",1);
        var hits = ent.game.getCollisions(ent.x,ent.y);
        hits.forEach(function(hit){
          var dmg = 10; //damage
          if (hit.team == ent.team){
            dmg *= ent.game.lobby.settings.friendlyFire;
          }
          hit.damage(dmg);
        });
      }
    }
  }
}