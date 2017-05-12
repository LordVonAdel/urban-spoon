canvas = null;
ctx = null;
function gameStart(){
  canvas = document.getElementById("gameCanvas");
  ctx = canvas.getContext('2d');
  gameLoop();
}
function draw(){

  canvas.height = window.innerHeight;
  canvas.width = window.innerWidth;

  if(ctx == null){
    return false;
  }
  //background
  var grd = ctx.createLinearGradient(0,0,0,canvas.height);
  grd.addColorStop(0,"#404040");
  grd.addColorStop(1,"#121212");
  ctx.fillStyle = grd;

  ctx.fillRect(0,0,canvas.width,canvas.height)

  //terrain
  ctx.beginPath();
  ctx.moveTo(0,canvas.height);
  ctx.lineTo(0,y);
  for(var i=0; i<terrain.nodes.length; i++){
    var x = i * terrain.ppn;
    var y = canvas.height-terrain.nodes[i]*500;
    ctx.lineTo(x,y);
  }
  ctx.lineTo(terrain.nodes.length*terrain.ppn,canvas.height);
  ctx.lineWidth = 5;
  ctx.strokeStyle= "#ffffff"
  ctx.stroke();

  var grd = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grd.addColorStop(0, "#121250");
  grd.addColorStop(1, "#404050");
  ctx.fillStyle = grd;

  //ctx.fillStyle = "#121250";

  ctx.fill();
}
function gameLoop(){
  draw();
  requestAnimationFrame(gameLoop)
}
terrain = {
  nodes: [],
  ppn: 8 //pixel per node
}
