//Game controls the game actions. What player is next and how projectiles fly and this stuff
World = require('./world.js');

function Game(lobby){
  this.nextEntId = 0;
  this.lobby = lobby;
  this.ents = {};
  console.log("Start game from lobby "+this.lobby.name+" !");
  this.lobby.broadcast("start",{});
  this.world = new World(this.lobby.settings.worldGenerator,this.lobby.settings.worldSize);
  this.world.sync(this.lobby);
  this.goalReady = false;
  this.startTime = new Date();
  this.wind = 0;

  var that = this;

  this.teams = [];
  for (var i=0; i<this.lobby.teams.length; i++){
    team = {};
    team.energy = that.lobby.settings.startEnergy;
    team.maxEnergy = (that.lobby.settings.limitEnergy ? 0 : Infinity);
    team.unitNumber = 0;
    team.maxUnits = 0;
    team.score = 0;
    team.base = null;
    team.active = true;
    team.stats = {
      damageGet: 0,
      damageDone: 0,
      unitsBuild: 0,
      unitsLost: 0,
      unitsDestroyed: 0,
      energyCollected: 0,
      energyHigh: 0,
      buildingsConstructed: 0,
      buildingsDestroyed: 0,
      buildingsLost: 0,
      shotsFired: 0,
      shotsHit: 0,
      shotAccuracy: 100
    }
    this.teams.push(team);
  }
  this.syncTeams();
  this.init();
}

Game.prototype.init = function(){
  if (this.lobby.settings.bases == "auto"){
    //auto place bases
    var b = ((this.world.terrain.length * this.world.terrain.ppn) / this.teams.length);
    for(var i=0; i<this.teams.length; i++){
      this.place(i, b*i+b/2,0,"base");
    }
    this.goalReady = true;
  }else{
    if (this.lobby.settings.bases == "free"){ //let the user place the base
      this.lobby.broadcast('placement',{sprite: "sprites/base.png", type: "base", text: "Place the base for your team!"});
    }else{
      this.goalReady = true;
    }
  }
}

Game.prototype.checkWin = function(){ //check for the winning team and if someone wins execute win stuff.

  var activeTeams = 0;
  var lastActiveTeam = null;
  for(var i=0; i<this.teams.length; i++){
    var team = this.teams[i];
    if (team.active == true){
      activeTeams ++;
      lastActiveTeam = i;
    }
  }

  if(activeTeams == 1){
    this.end(lastActiveTeam);
  }

  if(activeTeams <= 0){
    //this should never happen!
    this.end(-1);
  }

  if(this.goalReady){
    switch (this.lobby.settings.goal){
      case "bases":
        var bases = 0;
        var winner = -1;
        this.teams.forEach(function(team, i){
          if (team.base != null){
            bases ++;
            winner = i;
          }
        });
        if (bases == 1){
          this.end(winner);
        }
        if (bases == 0){
          //both bases destroyed at the same time!
          this.end(-1);
        }
      break;
      case "energy10000":
        this.teams.forEach(function(team, i){
          if (team.energy >= 10000){
            that.end(i); //if multiple win at once the team with the lower index wins!
          }
        });
      break;
      default:
        this.end(); //unkown goal
      break;
    }
  }
}

Game.prototype.teamUpdate = function(){
  for(var i=0; i<this.lobby.teams.length; i++){
    var lobbyTeam = this.lobby.teams[i];
    if (lobbyTeam.clients.length <= 0){
      this.teams[i].active = false;
    }
  }
}

Game.prototype.end = function(winner){ //ends the game
  //if winner == -1 no one wins
  this.lobby.game = null;
  this.lobby.issues.inGame = false;
  var teams = [];
  for(var i=0; i<this.teams.length; i++){
    teams.push(this.teams[i].stats);
  }
  this.lobby.broadcast('end',{teams: teams, winner: winner});
  console.log("End game from lobby "+this.lobby.name+"!");
}

Game.prototype.place = function(team,x,y,type){ //place an entity in the world and synchronise it with everyone in this lobby
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
    //ent.teamData.stats.unitsBuild += 1;
    if (preset.unique){
      this.lobby.broadcastTeam('placement',null,team);
      //if the ent is unique send to the team members they don't need to place it because it already was placed
    }
    var t = this.teams[team];
    if (preset.type == "vehicle"){
      t.stats.unitsBuild += 1;
    }else if(preset.type == "projectile"){
      t.stats.shotsFired += 1;
    }
    if (preset.unitCosts != undefined){
        t.unitNumber += preset.unitCosts;
    }
    if (preset.unitCapacity != undefined){
        t.maxUnits += preset.unitCapacity;
    }
    if (preset.energyCapacity != undefined){
      t.maxEnergy += preset.energyCapacity;
    }
    this.syncTeams(team);
    ent.sync();
    return ent;
  }else{
    console.error("[Error]Unknown entity: "+type);
  }
}

Game.prototype.getCollisions = function(x,hy){
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

Game.prototype.getCollisionArea = function(x1,x2){
  var res = [];
  for (var k in this.ents){
    var ent = this.ents[k];
    var l = ent.x - ent.width / 2;
    var r = ent.x + ent.width / 2;
    if (x1 <= r && l <= x2){
      res.push(ent);
    }
  }
  return res; //returns array with colliding objects
}

Game.prototype.playerSelect = function(client,entID){ //when a player selects an entity. This function is called at client.js
  //send him information about the entity back
  var ent = this.ents[entID];
  if (ent == undefined){
    return false;
  }
  client.selectedEnt = ent;
  client.socket.emit('selDat',ent.getSelectData(client.team == ent.team));
}

Game.prototype.playerAction = function(client,data){ //when a player clicks on an action. This function is called at client.js too!
  if (data == undefined){
    return false;
  }
  var actionIndex = data.index;
  var extra = data.extra || {};
  var ent = client.selectedEnt
  if (ent != null){
    if (ent.team == client.team){
      var action = ent.preset.actions[actionIndex];
      var costs = action.costs;
      var type = action.type;
      var team = this.teams[client.team];
      if (type == "vehicle"){
        var preset = entities[ent.preset.actions[actionIndex].ent];
        if (preset != undefined){
          if (team.unitNumber + preset.unitCosts > team.maxUnits){
            return "action.unitLimitReached"; //unit limit reached!
          }
        }
      }
      if (type == "build"){
        var preset = entities[action.ent];
        if (preset != undefined && extra.x != undefined){
          if (this.getCollisionArea(extra.x-preset.width/2, extra.x+preset.width/2).length > 0){
            return "action.positionBlocked";
          }
        }else{
          return "missing preset";
        }
      }
      if (ent.actionTimers[actionIndex].t > 0){
        return "action.cooldownActive";
      }
      if (team.energy >= costs){
        team.energy -= costs;
        if (action.time == undefined){
          client.selectedEnt.fire("a"+actionIndex,extra);
        }else{
          ent.actionTimers[actionIndex].t = action.time;
          ent.actionTimers[actionIndex].d = true; //do!
          ent.syncTimers();
        }
        this.syncTeams(client.team);
        if (action.cooldown){
          ent.actionTimers[actionIndex].t = action.cooldown;
          ent.syncTimers();
        }
      }
    }
  }
}

Game.prototype.playerAuto = function(client,data){
  if (data == undefined){
    return false;
  }
  if (data.index == undefined || data.auto == undefined){
    return false;
  }
  var actionIndex = data.index;
  var ent = client.selectedEnt
  if (ent != null){
    if (ent.team == client.team){
      var action = ent.preset.actions[actionIndex];
      if (action.auto){
        ent.auto = data.auto;
        ent.syncAuto();
      }
    }
  }
}

Game.prototype.syncTeams = function(team){ //sends every player information about their team
  if (team == undefined){
    for(var i=0; i<this.teams.length; i++){
      var t = this.teams[i];
      this.lobby.broadcastTeam('t',{energy: t.energy, id: i, units: t.unitNumber, maxUnits: t.maxUnits, maxEnergy: t.maxEnergy},i);
      this.teams[i].stats.energyHigh = Math.max(this.teams[i].energy, this.teams[i].stats.energyHigh);
    }
  }else{
    var t = this.teams[team];
    this.lobby.broadcastTeam('t',{energy: t.energy, id: team, units: t.unitNumber, maxUnits: t.maxUnits},team);
  }
}

Game.prototype.tick = function(){ //called every tick from the lobby
  for(var k in this.ents){
    var ent = this.ents[k];
    ent.tick();
  }
}

Game.prototype.second = function(){ //called every second from the lobby
  for(var k in this.ents){
    var ent = this.ents[k];
    ent.fire("second",null);
  }
  this.syncTeams();

  if (!this.goalReady){
    if (this.teams.every(function(t){return t.base != null})){
      this.goalReady = true;
    }
  }

  this.checkWin();

  this.wind += 1-Math.random()*2;

}

Game.prototype.showEffect = function(x,y,sprite,duration){
  this.lobby.broadcast('e',[x,y,sprite,duration]);
}

Game.prototype.teamGiveEnergy = function(teamIndex, amount){
  var teamData = this.teams[teamIndex];
  var transfer = Math.min(teamData.maxEnergy-teamData.energy,amount);
  teamData.energy += transfer;
  teamData.stats.energyCollected += transfer;
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
  this.actionTimers = [];
  this.teamData = this.game.teams[this.team];
  this.isDestroyed = false;

  for (var i=0; i<this.preset.actions.length; i++){
    var action = this.preset.actions[i];
    if (action.cooldown){
      this.actionTimers.push({t: 0, m: action.cooldown});
    }else if (action.time){
      this.actionTimers.push({t: 0, m: action.time, d: false});
    }else{
      this.actionTimers.push({t: 0, m: 0});
    }

  }

  this.fire = function(event,data){
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
      this.game.lobby.broadcast(4,[this.id,Math.atan2(this.dy,this.dx),Math.sqrt(this.dx*this.dx + this.dy*this.dy)]);
    }
  }

  this.syncSource = function(){
    if (this.source != undefined){
      this.game.lobby.broadcast(6,[this.id,this.source]);
    }
  }

  this.syncAuto = function(){
    if (this.auto != undefined){
      this.game.lobby.broadcast(7,[this.id,this.auto]);
    }
  }

  this.syncTimers = function(){
    var res = [];
    this.actionTimers.forEach(function(timer){
      res.push(timer.t);
    });
    this.game.lobby.broadcastTeam(5,[this.id, res],this.team);
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
        this.fire("worldCollision");
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

    for (var i=0; i<this.actionTimers.length; i++){
      if (this.actionTimers[i].t > 0){
        this.actionTimers[i].t -= 1/60;
      }
      if (this.actionTimers[i].t <= 0){ //when the timer of an action hits 0
        if( this.preset.actions[i].auto && this.auto){
          this.game.playerAction({selectedEnt: this, team: this.team},{index: i, extra:{}});
        }
        if (this.actionTimers[i].d){
          this.fire("a"+i);
          this.actionTimers[i].d = false;
        }
      }
    }
    var collisions = this.game.getCollisionArea(this.x-this.width/2,this.x+this.width/2);
    if (collisions.length > 1){
      for (var i=0; i<collisions.length; i++){
        var ent = collisions[i];
        if (ent.team == this.team && ent.type == "builder"){
          this.fire("builder");
        }
      }
    }

    this.fire('tick');
  }

  this.destroy = function(){
    this.game.lobby.broadcast('x',this.id);
    delete this.game.ents[this.id];

    var team = this.teamData;
    if (this.preset.unitCosts != undefined){
      team.unitNumber -= this.preset.unitCosts;
    }
    if (this.preset.unitCapacity != undefined){
      team.unitCapacity -= this.preset.unitCapacity;
    }
    if (preset.energyCapacity != undefined){
      team.maxEnergy -= this.preset.energyCapacity;
    }
    if (this.preset.type == "vehicle"){
      team.stats.unitsLosts += 1;
    }else if(this.preset.type == "building"){
      team.stats.buildingsLost += 1;
    }

    this.fire('destroy');
    this.isDestroyed = true;
  }

  this.damage = function(damage){
    this.hp -= damage;
    if (this.hp <= 0){
      this.destroy();
      this.game.showEffect(this.x+this.width/2+10,this.y-2,"sprites/effectSmoke.png",1);
      this.game.showEffect(this.x+this.width/2-10,this.y+2,"sprites/effectSmoke.png",1);
      this.game.showEffect(this.x+this.width/2,this.y-8,"sprites/effectSmoke.png",1);
      this.teamData.stats.unitsLost += 1;
    }else{
      this.sync();
    }
  }

  this.fire("spawn");
  this.syncAuto();

  this.game.lobby.broadcast('build',{
    x: this.x,
    y: this.y,
    sprite: this.preset.sprite,
    id: this.id,
    team: this.team,
    hp: this.hp,
    hpMax: this.preset.health,
    angle: 0,
    grounded: this.preset.grounded,
    timers: this.actionTimers
  });
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
    energyCapacity: 1000,
    events: {
      spawn: function(ent){
        ent.game.place(ent.team,ent.x+256,ent.y,"tank");
        ent.game.teams[ent.team].base = ent;
      },
      destroy: function(ent){
        ent.game.teams[ent.team].base = null;
        ent.game.checkWin();
      },
      second: function(ent){
        ent.game.teamGiveEnergy(ent.team, 5);
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
        ent: "builder",
        time: 5
      },
      {
        type: "vehicle",
        costs: 50,
        name: "Tank",
        client: "click",
        ent: "tank",
        time: 5
      },
      {
        type: "ability",
        costs: 200,
        name: "Shield",
        client: "click"
      }
    ]
  },
  powerplant: {
    flat: true,
    type: "building",
    width: 64,
    name: "Power Plant",
    sprite: "sprites/powerplant.png",
    health: 30,
    grounded: true,
    events: {
      second: function(ent){
        ent.game.teamGiveEnergy(ent.team, 10);
      }
    }
  },
  hangar: {
    flat: true,
    type: "building",
    width: 64,
    name: "Hangar",
    sprite: "sprites/hangar.png",
    health: 30,
    grounded: true,
    unitCapacity: 3
  },
  construction: {
    flat: false,
    health: 100,
    name: "Construction",
    sprite: "sprites/construction64.png",
    grounded: true,
    width: 64,
    events: {
      spawn: function(ent){
        ent.buildEnt = null;
        ent.hp = 1;
      },
      builder: function(ent){
        if (ent.hp >= 100){
          if (ent.buildEnt != null){
            ent.game.place(ent.team,ent.x,ent.y,ent.buildEnt);
            ent.destroy();
            ent.teamData.stats.buildingsConstructed += 1;
          }
        }
        ent.hp += 1;
        ent.sync();
      },
      setBuilding: function(ent,building){
        var preset = entities[building];
        if (preset == undefined){
          ent.destroy();
        }else{
          ent.buildPreset = preset;
          ent.buildEnt = building;
        }
      }
    }
  },
  builder: {
    type: "vehicle",
    width: 64,
    name: "Builder",
    sprite: ["sprites/vehicleBuilder.png"],
    health: 40,
    angleToGround: true,
    grounded: true,
    unitCosts: 1,
    events:{
      a0: function(ent,data){
        if (data.x != undefined){
          ent.driveTo(data.x);
        }
      },
      a1: function(ent,data){
        if (data.x != undefined){
          //ent.game.place(ent.team,data.x,ent.y,"hangar");
          var construction = ent.game.place(ent.team,data.x,ent.y,"construction");
          construction.fire("setBuilding","hangar");
          ent.driveTo(data.x);
        }
      },
      a2: function(ent,data){
        if (data.x != undefined){
          //ent.game.place(ent.team,data.x,ent.y,"powerplant");
          var construction = ent.game.place(ent.team,data.x,ent.y,"construction");
          construction.fire("setBuilding","powerplant");
          ent.driveTo(data.x);
        }
      }
    },
    actions: [
      {
        type: "ability",
        costs: 0,
        name: "Move",
        client: "drive"
      },
      {
        type: "build",
        costs: 250,
        name: "Build Hangar",
        client: "build",
        sprite: "sprites/hangar.png",
        ent: "hangar"
      },
      {
        type: "build",
        costs: 400,
        name: "Build Powerplant",
        client: "build",
        sprite: "sprites/powerplant.png",
        ent: "powerplant"
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
        ent.dx = 100; //delta x
        ent.dy = -100; //delta y
      },
      a1: function(ent,data){
        data.dx = data.dx || 0;
        data.dy = data.dy || 0;

        var angle = Math.atan2(data.dy,data.dx);
        var distance = Math.min(Math.sqrt(data.dx*data.dx + data.dy*data.dy),256); //cap shoot power

        ent.dx = Math.cos(angle)*distance;
        ent.dy = Math.sin(angle)*distance;

        ent.sync();
      },
      a2: function(ent){
        var bullet = ent.game.place(ent.team,ent.x,ent.y-1,"bullet");
        bullet.hspeed = (ent.dx / 256)*20;
        bullet.vspeed = (ent.dy / 256)*20;
        bullet.source = ent.id;
        bullet.syncSource();
      },
      a0: function(ent,data){
        if (data.x != undefined){
          ent.driveTo(data.x);
        }
      }
    },
    actions: [
      {
        type: "ability",
        costs: 0,
        name: "Move",
        client: "drive"
      },
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
        client: "click",
        cooldown: 5,
        auto: true
      }
    ]
  },
  bullet: {
    sprite: "sprites/bullet.png",
    grounded: false,
    gravity: 1,
    type: "projectile",
    events: {
      worldCollision: function(ent){
        ent.destroy();
        ent.game.showEffect(ent.x-16,ent.y+16,"sprites/effectSmoke.png",1);
        var hits = ent.game.getCollisions(ent.x,ent.y);
        if (hits.length > 0){
          ent.teamData.stats.shotsHit += 1;
        }
        hits.forEach(function(hit){
          var dmg = 10; //damage
          if (hit.team == ent.team){
            dmg *= ent.game.lobby.settings.friendlyFire;
          }
          hit.damage(dmg);
          hit.teamData.stats.damageGet += dmg;
          ent.teamData.stats.damageDone += dmg;
          if (hit.isDestroyed){
            if (hit.preset.type == "vehicle"){
              ent.teamData.stats.unitsDestroyed += 1;
            }else if(hit.preset.type == "building"){
              ent.teamData.stats.buildingsDestroyed += 1;
            }
          }
        });
        ent.teamData.stats.shotAccuracy = Math.round((ent.teamData.stats.shotsHit / ent.teamData.stats.shotsFired)*100);
      }
    }
  }
}

//check entities json object
for (var k in entities){
  var preset = entities[k];
  if (preset.actions == undefined){
    preset.actions = [];
  }
}

module.exports = Game;