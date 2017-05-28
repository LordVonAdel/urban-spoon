me = { //object with information about the own player
  name: "unnamed"
};
myTeam = { //object with information about the players team
  id: 0,
  energy: 0,
  units: 0,
  maxUnits: 0
}

isInLobby = false;
isReady = false;
isHost = false;
isInGame = false;

canvas = null;
ctx = null;
camX = 0;
camY = 0;
camW = 100;
camH = 100;
camDrag = false;
camDragX = 0;
camDragY = 0;

placement = null;
animationTick = 0;

ents = {};
selectedEnt = null;
selectedEntUI = null;

effects = [];

worldHeight = 1000;

currentAction = null; //target, drive, place...

var drawBuffer = document.createElement('canvas');

function showPanel(panel){
  $('.panel, #game').slideUp(100);
  $('#'+panel).slideDown(100);
}

function gameStart(){
  canvas = document.getElementById("gameCanvas");
  ctx = canvas.getContext('2d');
  ctx.font = "24px Verdana";
  isInGame = true;

  gameLoop();

  //add event listeners for controls and stuff
  $(document).on('keydown',function(e){
    inputDownKeys[e.keyCode] = true;
    inputPressKeys[e.keyCode] = true;
  });
  $(document).on('keyup',function(e){
    delete inputDownKeys[e.keyCode];
    inputReleaseKeys[e.keyCode] = true;
  })
  $(document).on('mousedown',function(e){
    inputDownKeys["M"+e.button] = true;
    inputPressKeys["M"+e.button] = true;
  });
  $(document).on('mouseup',function(e){
    delete inputDownKeys["M"+e.button];
    inputReleaseKeys["M"+e.button] = true;
  });
  $(canvas).on('mousemove',function(e){
    mouseVX = e.clientX;
    mouseVY = e.clientY;
    e.preventDefault();
  });
  document.getElementById("gameCanvas").addEventListener('contextmenu', function(evt) { 
    evt.preventDefault();
  }, false);

}

function draw(){

  canvas.height = window.innerHeight;
  canvas.width = window.innerWidth;
  worldHeight = canvas.height;

  camW = canvas.width;

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
  for(var i=Math.floor(camX/terrain.ppn); i<Math.ceil((camX+camW)/terrain.ppn)+1; i++){
    var x = i * terrain.ppn - camX;
    var y = canvas.height-terrain.nodes[i]*terrain.amplitude;
    ctx.lineTo(x,y);
  }
  ctx.lineTo(terrain.nodes.length*terrain.ppn,canvas.height);
  ctx.lineWidth = 5;
  ctx.strokeStyle= "#ffffff";
  ctx.stroke();

  var grd = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grd.addColorStop(0, "#121250");
  grd.addColorStop(1, "#404050");
  ctx.fillStyle = grd;
  ctx.fill();

  /*ctx.fillStyle = "#ff0000" //debug point on landscape
  drawCircle(mouseX,terrain.getY(mouseX),4);*/

  //entities
  for(var k in ents){
    var ent = ents[k];
    var yy = worldHeight-ent.y;
    var x = ent.x;
    var sprite = ent.sprite;
    var spriteSec = null; //secondary sprite
    var imgSec = null;
    var team = ent.team;

    if (typeof ent.sprite == typeof []){
      sprite = ent.sprite[0];
      spriteSec = ent.sprite[1];
      if (sprites[spriteSec] == undefined){
        sprites[spriteSec] = new Image();
        sprites[spriteSec].src = spriteSec;
      }
      imgSec = sprites[spriteSec];
    }

    if (sprites[sprite] == undefined){
      sprites[sprite] = new Image();
      sprites[sprite].src = sprite;
    }

    for (var j=0; j<ent.timers.length; j++){
      var timer = ent.timers[j];
      if (timer.m != 0 && timer.t > 0){
        timer.t -= 1/60;
      }
    }

    var img = sprites[sprite];
    ent.w = img.width;
    ent.h = img.height;

    ctx.lineWidth = 1;

    var hover = mouseOver(ent.x-ent.w/2,yy-ent.h,ent.x+ent.w/2,yy,ent)

    if (ent == selectedEnt && !hover){
      ctx.strokeStyle = "#00ff00";
      drawRectangleStroke(ent.x-ent.w/2,yy-ent.h,ent.w,ent.h);
    }
    if (hover){
      if (keyCheckPressed("M0")){
        selectedEnt = ent; //select this entity
        currentAction = null;
        socket.emit('sel',k);
      }
      ctx.strokeStyle = "#0000ff";
      drawRectangleStroke(ent.x-ent.w/2,yy-ent.h,ent.w,ent.h);
    }
    if (hover || ent == selectedEnt){
      drawHealthbar(ent.x-ent.w/2,yy+8,ent.w,ent.hp,ent.hpMax,"#ff0000","#00ff00","#000000");
    }
    if (ent == selectedEnt){
      if (currentAction != null){ //draw helpers for the current action. (target, drive...)
        switch (currentAction.client){
          case "target":
            ctx.globalAlpha = 0.2;
            ctx.fillStyle = "#ffffff";
            drawCircle(ent.x,worldHeight-ent.y,256);
            ctx.globalAlpha = 1;
            ctx.strokeStyle = "#000000";
            drawLine(ent.x,worldHeight-ent.y, mouseX, mouseY);
          break;
          case "drive":
            ctx.strokeStyle = "#ff0000";
            drawLine(ent.x,worldHeight - ent.y, mouseX ,terrain.getY(mouseX));
            drawSprite(mouseX-32,terrain.getY(mouseX)-64,"sprites/effectArrow.png");
          break;
        }
      }
    }
    if (spriteSec){
      drawSpriteAngleColor(x,yy-img.height+16,spriteSec,-ent.target,0,imgSec.height/2,teamColors[team]);
    }
    if (ent.angle == 0){
      drawSpriteColor(x-img.width/2,yy-img.height,sprite,teamColors[team]);
    }else{
      drawSpriteAngleColor(x,yy,sprite,ent.angle,ent.w/2,ent.h,teamColors[team]);
    }
    var hy = yy+8+20// healthbar Y;
    for (var i=0; i<ent.timers.length; i++){
      var timer = ent.timers[i];
      if (timer.t > 0){
        drawHealthbar(ent.x-ent.w/2,hy,ent.w,timer.t,timer.m,"#002f7c","#4286f4","#000000")
        hy += 20;
      }
    }
  }

  //placement
  if(placement != null){
    drawPlacement(mouseX,mouseH,placement.sprite)
    if (keyCheckPressed("M0")){
      socket.emit('place',{x: mouseX, y: 0, type: placement.type})
      placement = null;
    }
  }

  var res = [];
  for(var j=0; j<effects.length; j++){
    var effect = effects[j];
    var per = effect.time / effect.duration;
    ctx.globalAlpha = per;
    drawSprite(effect.x,effect.y,effect.sprite);
    ctx.globalAlpha = 1;
    effect.time --;
    if (effect.time > 0){
      res.push(effect);
    }
  }
  effects = res;

  drawUI();
}

function gameLoop(){

  animationTick ++;
  if (animationTick >= 60){
    animationTick = 0;
  }

  mouseX = mouseVX + camX;
  mouseY = mouseVY + camY;

  if(keyCheckDown(39)){
    camX += 3;
  }
  if(keyCheckDown(37)){
    camX -= 3;
  }
  if (keyCheckPressed("M2")){ //right click
    if (currentAction != null){ //first abort action
      currentAction = null;
    }else{ //then deselect when right click again
      selectedEnt = null;
      selectedEntUI = null;
    }
  }
  if(keyCheckPressed("M1")){ //middle click
    camDrag = true;
    camDragX = mouseX;
  }
  if(keyCheckReleased("M1")){ //middle click
    camDrag = false;
  }
  if(camDrag){
    camX = camDragX - (mouseX - camX); //drag view
  }

  mouseX = mouseVX + camX;
  mouseH = terrain.getY(mouseX);

  camX = Math.min(Math.max(camX,0),(terrain.nodes.length*terrain.ppn)-camW);

  draw();

  if (currentAction != null && keyCheckPressed("M0")){ //on left click
    switch (currentAction.client){
      case "target":
        var deltaX = mouseX - selectedEnt.x;
        var deltaY = mouseY - (worldHeight - selectedEnt.y);
        socket.emit('a',{index: currentAction.index, extra: {dx: deltaX, dy: deltaY}}); //delta x, delta y 
        currentAction = null;
      break;
      case "drive":
        socket.emit('a',{index: currentAction.index, extra: {x: mouseX}});
        currentAction = null;
        spawnEffect(mouseX-32,terrain.getY(mouseX)-64,"sprites/effectArrow.png",1);
      break;
    }
  }

  inputNext();
  requestAnimationFrame(gameLoop);
}

terrain = {
  nodes: [],
  ppn: 8, //pixel per node
  amplitude: 400,
  getHeight: function(x){
    var node1 = terrain.nodes[Math.floor(x/terrain.ppn)];
    var node2 = terrain.nodes[Math.ceil(x/terrain.ppn)];
    var l = x % terrain.ppn;
    return node1+((l/8) * (node2 - node1));
  },
  getY: function(x){
    return worldHeight - (terrain.getHeight(x))*terrain.amplitude;
  }
}

//input
var inputDownKeys = {};
var inputPressKeys = {};
var inputReleaseKeys = {};
var mouseX = 0;
var mouseY = 0;
var mouseVX = 0;
var mouseVY = 0;
var inputHlast = null;
var inputHover = null;

function keyCheckDown(code){
  if(inputDownKeys[code] != undefined){
    return true;
  }else{
    return false;
  }
}

function keyCheckPressed(code){
  if(inputPressKeys[code] != undefined){
    return true;
  }else{
    return false;
  }
}

function keyCheckReleased(code){
  if(inputReleaseKeys[code] != undefined){
    return true;
  }else{
    return false;
  }
}

function mouseOver(x1,y1,x2,y2,id){
  if (mouseX > x1 && mouseY > y1 && mouseX < x2 && mouseY < y2){
    inputHover = id;
    if (inputHlast == id){
      return true;
    }
  }
  return false;
}

function mouseOverUI(x1,y1,x2,y2,id){
  if (mouseVX > x1 && mouseVY > y1 && mouseVX < x2 && mouseVY < y2){
    inputHover = id;
    if (inputHlast == id){
      return true;
    }
  }
  return false;
}

function inputNext(){
  inputPressKeys = {};
  inputReleaseKeys = {};
  inputHlast = inputHover;
  inputHover = null;
}

//extra draw stuff
sprites = {};

function drawCircle(x,y,radius){
  ctx.beginPath();
  ctx.arc(x-camX, y-camY, radius, 0, 2 * Math.PI, false);
  ctx.fill();
}

function drawRectangle(x,y,width,height){
  ctx.fillRect(x-camX,y-camY,width,height)
}
function drawRectangleStroke(x,y,width,height){
  ctx.strokeRect(x-camX,y-camY,width,height)
}

function drawSprite(x,y,sprite){
  if (sprites[sprite] == undefined){
    sprites[sprite] = new Image();
    sprites[sprite].src = sprite;
  }
  ctx.drawImage(sprites[sprite],x-camX,y-camY);
}

function drawText(text,x,y){
  ctx.fillText(text,x-camX,y-camY);
}

function drawPlacement(x,y,sprite){
  ctx.globalAlpha = (Math.sin((animationTick/60)*Math.PI*2)+1)/4+0.5;
  if (sprites[sprite] == undefined){
    sprites[sprite] = new Image();
    sprites[sprite].src = sprite;
  }
  var img = sprites[sprite];
  ctx.drawImage(img,x-camX-img.width/2,y-camY-img.height);
  ctx.globalAlpha = 1;
}

function drawSpriteColor(x,y,sprite,color){
  if (sprites[sprite] == undefined){
    sprites[sprite] = new Image();
    sprites[sprite].src = sprite;
  }
  var img = sprites[sprite];
  
  var buffer = drawBuffer;
  buffer.width = img.width;
  buffer.height = img.height;

  bx = buffer.getContext('2d');
  bx.fillStyle = color;
  bx.fillRect(0,0,buffer.width,buffer.height);
  bx.globalCompositeOperation = "destination-atop";
  bx.drawImage(img,0,0);

  ctx.drawImage(img,x-camX,y-camY);
  ctx.globalAlpha = 0.5;
  ctx.drawImage(buffer,x-camX,y-camY);
  ctx.globalAlpha = 1;

}

function drawSpriteAngle(x,y,sprite,angle,px,py){
  if (sprites[sprite] == undefined){
    sprites[sprite] = new Image();
    sprites[sprite].src = sprite;
  }

  var xx = x-camX;
  var yy = y-camY;

  ctx.translate(xx,yy);
  ctx.rotate(-angle);
  ctx.drawImage(sprites[sprite],-px,-py);
  ctx.rotate(angle);
  ctx.translate(-xx,-yy);
}

function drawSpriteAngleColor(x,y,sprite,angle,px,py,color){
  if (sprites[sprite] == undefined){
    sprites[sprite] = new Image();
    sprites[sprite].src = sprite;
  }

  var img = sprites[sprite];
  var xx = x-camX;
  var yy = y-camY;

  var buffer = drawBuffer;
  buffer.width = img.width;
  buffer.height = img.height;

  bx = buffer.getContext('2d');
  bx.fillStyle = color;
  bx.fillRect(0,0,buffer.width,buffer.height);
  bx.globalCompositeOperation = "destination-atop";
  bx.drawImage(img,0,0);

  ctx.translate(xx,yy);
  ctx.rotate(-angle);
  ctx.drawImage(sprites[sprite],-px,-py);
  ctx.globalAlpha = 0.5;
  ctx.drawImage(buffer,-px,-py);
  ctx.globalAlpha = 1;
  ctx.rotate(angle);
  ctx.translate(-xx,-yy);
}

function drawHealthbar(x,y,width,hp,max,color1,color2,colorText){
  var per = hp/max;
  ctx.fillStyle = color1;
  drawRectangle(x,y,width,16);

  ctx.fillStyle = color2;
  drawRectangle(x,y,width*per,16);

  ctx.fillStyle = colorText;
  ctx.font = "14px Verdana";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  drawText(Math.round(hp)+" / "+Math.round(max),x+width/2,y);
  ctx.textAlign = "left";
}

function drawLine(x1,y1,x2,y2){
  ctx.beginPath();
  ctx.moveTo(x1 - camX, y1 - camY);
  ctx.lineTo(x2 - camX, y2 - camY);
  ctx.stroke();
}

function spawnEffect(x,y,sprite,duration){
  effects.push({
    x: x,
    y: y,
    sprite: sprite,
    duration: duration * 60,
    time: duration * 60
  })
}