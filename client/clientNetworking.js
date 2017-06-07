var socket = io();

socket.on('leave',function(){ //show the login thing again
  showPanel('panelLogin');
  isInLobby = false;
});

socket.on('start',function(){
  showPanel('game');
  gameStart();
  isReady = false;
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
  $("#lobbyStatus").html("");
  data.forEach(function(info){
    $("#lobbyStatus").append("<div class='lobbyStat'><span class='lobby-icon-"+info.type+"'></span>"+info.msg+"</div>")
  });
  //$('#lobbyStatus').html(data);
});
socket.on('t',function(data){ //team data
  Object.assign(myTeam,data);
});
socket.on('end',function(data){
  isInGame = false;
  console.log("Game ends!",data);

  function insertTeams(attr){
    for(var i=0; i<teams.length; i++){
      html += "<th style='background-color: "+teamColors[i]+"'>"+teams[i][attr]+"</th>";
    }
  };

  var html = "<tr><th>Teams</th>"
  var teams = data.teams;
  for(var i=0; i<teams.length; i++){
    html += "<th>"+teamNames[i]+"</th>";
  }
  html+="</tr>";
  html+="<tr><th>Units Build</th>"
  insertTeams("unitsBuild");
  html+="</tr>";
  html+="<tr><th>Units Lost</th>"
  insertTeams("unitsLost");
  html+="</tr>";
  html+="<tr><th>Damage Done</th>"
  insertTeams("damageDone");
  html+="</tr>";
  html+="<tr><th>Damage Get</th>"
  insertTeams("damageGet")
  html+="</tr>";
  html+="<tr><th>Energy Collected</th>"
  insertTeams("energyCollected");
  
  html+="</tr>";
  $('#statsTable').html(html);

  showPanel('panelStats');

});
socket.on('selDat',function(data){ //data from selected object
  rClickOption = null;
  targetOption = null;
  selectedEntUI = data;
  if (selectedEntUI.options == undefined){
    selectedEntUI.options = [];
  }
  selectedEntUI.options.forEach(function(option,i){
    option.hoverFrame = 0;
    if (option.client == "drive"){
      rClickOption = option;
      rClickOption.index = i;
    }else if(option.client == "target"){
      targetOption = option;
      targetOption.index = i;
    }
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
socket.on(6,function(data){ //source (for trace)
  if (isInGame){
    var ent = ents[data[0]];
    if(ent != undefined){
      ent.source = data[1];
      var src = ents[data[1]];
      src.trace = [];
    }
  }
});
socket.on(7,function(data){
  if (isInGame){
    var ent = ents[data[0]];
    if(ent != undefined){
      ent.auto = data[1];
    }
  }
});