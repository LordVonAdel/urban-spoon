var socket = io();

socket.on('leave',function(){ //show the login thing again
  $('.panel').slideUp(100);
  $('#panelLogin').slideDown(100);
  isInLobby = false;
});

socket.on('start',function(){
  $('.panel').slideUp(100);
  $('#game').slideDown(100);
  gameStart();
});
socket.on('world',function(data){
  console.log('Got world data',data);
  terrain.nodes = data.nodes;
});
socket.on('placement',function(data){
  placement = data;
});
socket.on('build',function(data){
  ents[data.id] = {x: data.x, y: data.y, sprite: data.sprite, team: data.team, hp: data.hp, hpMax: data.hpMax};
});
socket.on('loginError',function(data){
  $('.loginError').html(data);
});
socket.on('lobbyStatus',function(data){
  $('#lobbyStatus').html(data);
});
socket.on(1,function(data){ //entity change
  var ent = ents[data[0]]
  if(ent != undefined){
    ent.x = data[1];
    ent.y = data[2];
    ent.hp = data[3];
  }
});