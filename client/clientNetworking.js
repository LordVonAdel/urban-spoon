var socket = io();

socket.on('leave',function(){ //show the login thing again
  showPanel('panelLogin');
  isInLobby = false;
});

socket.on('start',function(){
  showPanel('game');
  gameStart();
});
socket.on('world',function(data){
  terrain.nodes = data.nodes;
});
socket.on('placement',function(data){
  placement = data;
});
socket.on('build',function(data){
  ents[data.id] = {
    x: data.x,
    y: data.y, 
    sprite: data.sprite, 
    team: data.team, 
    hp: data.hp, 
    hpMax: data.hpMax, 
    angle: data.angle, 
    grounded: data.grounded,
    timers: data.timers,
    id: data.id
  };
  refreshRenderOrder();
});
socket.on('loginError',function(data){
  $('.loginError').html(data);
});
socket.on('lobbyStatus',function(data){
  $('#lobbyStatus').html(data);
});
socket.on('t',function(data){ //team data
  Object.assign(myTeam,data);
});
socket.on('end',function(data){
  isInGame = false;
  console.log("Game ends!",data);

  function insertTeams(attr){
    for(var i=0; i<teams.length; i++){
      html += "<th>"+teams[i][attr]+"</th>";
    }
  };

  var html = "<tr><th>Teams</th>"
  var teams = data.teams;
  for(var i=0; i<teams.length; i++){
    html += "<th>"+teamNames[i]+"</th>";
  }
  html+="</tr>";
  html+="<tr><th>Biggest Army</th>"
  insertTeams("biggestArmy");
  html+="</tr>";
  html+="<tr><th>Highest Energy Level</th>"
  insertTeams("highEnergy");
  html+="</tr>";
  html+="<tr><th>Damage Dealt</th>"
  insertTeams("damageDealt");
  html+="</tr>";
  html+="<tr><th>Damage Collected</th>"
  insertTeams("damageCollected")
  html+="</tr>";
  $('#statsTable').html(html);

  showPanel('panelStats');

});
socket.on('selDat',function(data){ //data from selected object
  selectedEntUI = data;
  if (selectedEntUI.options == undefined){
    selectedEntUI.options = [];
  }
  selectedEntUI.options.forEach(function(option){
    option.hoverFrame = 0;
  });
});
socket.on('x',function(data){ //destroy entity
  if (isInGame){
    delete ents[data];
  }
  refreshRenderOrder();
});
socket.on('e',function(data){ //show effect
  if (isInGame){
    spawnEffect(data[0],worldHeight-data[1],data[2],data[3]);
  }
})
socket.on(1,function(data){ //entity change
  if (isInGame){
    var ent = ents[data[0]];
    if(ent != undefined){
      ent.x = data[1];
      ent.y = data[2];
      ent.hp = data[3];
    }
  }
});
socket.on(2,function(data){ //entity angle
  if (isInGame){
    var ent = ents[data[0]];
    if(ent != undefined){
      ent.angle = data[1];
    }
  }
});
socket.on(3,function(data){ //entity velocity
  if (isInGame){
    var ent = ents[data[0]];
    if(ent != undefined){
      ent.hspeed = data[1];
      ent.vspeed = data[2];
    }
  }
});
socket.on(4,function(data){ //entity target
  if (isInGame){
    var ent = ents[data[0]];
    if(ent != undefined){
      ent.target = data[1]; //target angle
      ent.tpower = data[2]; //target power
    }
  }
});
socket.on(5,function(data){ //timers
  if (isInGame){
    var ent = ents[data[0]];
    if(ent != undefined){
      for (var i=0; i<data[1].length; i++){
        ent.timers[i].t = data[1][i];
      }
    }
  }
});