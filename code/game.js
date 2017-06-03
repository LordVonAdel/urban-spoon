//Game controls the game actions. What player is next and how projectiles fly and this stuff
World = require('./world.js');

module.exports = function(lobby){
  this.nextEntId = 0;
  this.lobby = lobby;
  this.ents = {};
  console.log("Start game from lobby "+this.lobby.name+" !");
  this.lobby.broadcast("start",{});
  this.world = new World(this.lobby.settings.worldGenerator);
  this.world.sync(this.lobby);
  this.goalReady = false;

  var that = this;

  this.lobby.teams.forEach(function(team){
    team.energy = that.lobby.settings.startEnergy;
    team.unitNumber = 0;
    team.maxUnits = 0;
    team.score = 0;
    team.base = null;
    team.stats = {
      biggestArmy: 0,
      highEnergy: 0,
      damageDealt: 0,
      damageCollected: 0
    }
  });

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
      this.goalReady = true;
    }
  }

  this.checkWin = function(){ //check for the winning team and if someone wins execute win stuff.
    if(this.goalReady){
      switch (this.lobby.settings.goal){
        case "bases":
          var bases = 0;
          var winner = -1;
          this.lobby.teams.forEach(function(team, i){
            if (team.base != null){
              bases ++;
              winner = i;
            }
          });
          if (bases == 1){
            this.end(winner);
          }
          if (bases == 0){
            
          }
        break;
        case "energy10000":
          this.lobby.teams.forEach(function(team, i){
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

  this.end = function(winner){ //ends the game
    this.lobby.game = null;
    this.lobby.issues.inGame = false;
    var teams = [];
    for(var i=0; i<this.lobby.teams.length; i++){
      teams.push(this.lobby.teams[i].stats);
    }
    this.lobby.broadcast('end',{teams: teams, winner: winner});
    console.log("End game from lobby "+this.lobby.name+"!");
  }

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

  this.getCollisionArea = function(x1,x2){
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
    if (data == undefined){
      return false;
    }
    var actionIndex = data.index;
    var extra = data.extra || {};
    var ent = client.selectedEnt
    if (ent != null){
      if (ent.team == client.team){
        var action = ent.preset.actions[actionIndex]
        var costs = action.costs;
        var type = action.type;
        var team = this.lobby.getTeam(client.team);
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
          client.selectedEnt.fire("a"+actionIndex,extra);
          this.syncTeams(client.team);
          if (action.cooldown){
            ent.actionTimers[actionIndex].t = action.cooldown;
            ent.syncTimers();
          }
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

  this.second = function(){ //called every second from the lobby
    for(var k in this.ents){
      var ent = this.ents[k];
      ent.fire("second",null);
    }
    this.syncTeams();
    this.checkWin();
  }

  this.showEffect = function(x,y,sprite,duration){
    this.lobby.broadcast('e',[x,y,sprite,duration]);
  }

  this.syncTeams();

  if (!this.goalReady){
    if (this.lobby.teams.every(function(t){return t.base != null})){
      this.goalReady = true;
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
  this.speed = 2;
  this.actionTimers = [];

  for (var i=0; i<this.preset.actions.length; i++){
    var action = this.preset.actions[i];
    if (action.cooldown){
      this.actionTimers.push({t: 0, m: action.cooldown});
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

    var team = this.game.lobby.teams[this.team];
    if (this.preset.unitCosts != undefined){
      team.unitNumber -= this.preset.unitCosts;
    }
    if (this.preset.unitCapacity != undefined){
      team.unitCapacity -= this.preset.unitCapacity;
    }

    this.fire('destroy');
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

  this.fire("spawn");

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
    events: {
      spawn: function(ent){
        ent.game.place(ent.team,ent.x+256,ent.y,"tank");
        ent.game.lobby.teams[ent.team].base = ent;
      },
      destroy: function(ent){
        ent.game.lobby.teams[ent.team].base = null;
        ent.game.checkWin();
      },
      second: function(ent){
        ent.game.lobby.teams[ent.team].energy += 5;
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
        ent.game.lobby.teams[ent.team].energy += 10;
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
    width: 48,
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
        ent.dy = 100; //delta y
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
        cooldown: 5
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

//check entities json object
for (var k in entities){
  var preset = entities[k];
  if (preset.actions == undefined){
    preset.actions = [];
  }
}