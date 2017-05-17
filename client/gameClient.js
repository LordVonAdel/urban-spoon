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

var drawBuffer = document.createElement('canvas');

function gameStart(){
  canvas = document.getElementById("gameCanvas");
  ctx = canvas.getContext('2d');

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

  ctx.fillStyle = "#ff0000"
  drawCircle(mouseX,terrain.getY(mouseX),4);

  //entities
  for(var k in ents){
    var ent = ents[k];
    var yy = canvas.height-ent.y;
    var x = ent.x;
    var sprite = ent.sprite;
    var team = ent.team;

    if (sprites[sprite] == undefined){
      sprites[sprite] = new Image();
      sprites[sprite].src = sprite;
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
        socket.emit('sel',k);
        console.log("Select "+k);
      }
      ctx.strokeStyle = "#0000ff";
      drawRectangleStroke(ent.x-ent.w/2,yy-ent.h,ent.w,ent.h);
    }
    if (hover || ent == selectedEnt){
      drawHealthbar(ent.x-ent.w/2,yy+8,ent.w,ent.hp,ent.hpMax);

    }
    if (ent.angle == 0){
      drawSpriteColor(x-img.width/2,yy-img.height,sprite,teamColors[team]);
    }else{
      drawSpriteAngleColor(x,yy,sprite,-ent.angle,ent.w/2,ent.h,teamColors[team]);
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
  if (keyCheckDown("M2")){
    selectedEnt = null;
    selectedEntUI = null;
  }
  if(keyCheckPressed("M1")){ //right click
    camDrag = true;
    camDragX = mouseX;
  }
  if(keyCheckReleased("M1")){ //right click
    camDrag = false;
  }
  if(camDrag){
    camX = camDragX - (mouseX - camX); //drag view
  }

  mouseX = mouseVX + camX;
  mouseH = terrain.getY(mouseX);

  camX = Math.min(Math.max(camX,0),(terrain.nodes.length*terrain.ppn)-camW);

  draw();

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
    return canvas.height - (terrain.getHeight(x))*terrain.amplitude;
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
  var img = sprites[sprite]
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
  ctx.rotate(angle);
  ctx.drawImage(sprites[sprite],-px,-py);
  ctx.rotate(-angle);
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
  ctx.rotate(angle);
  ctx.drawImage(sprites[sprite],-px,-py);
  ctx.globalAlpha = 0.5;
  ctx.drawImage(buffer,-px,-py);
  ctx.globalAlpha = 1;
  ctx.rotate(-angle);
  ctx.translate(-xx,-yy);
}

function drawHealthbar(x,y,width,hp,max){
  var per = hp/max;
  ctx.fillStyle = "#ff0000";
  drawRectangle(x,y,width,16);

  ctx.fillStyle = "#00ff00";
  drawRectangle(x,y,width*per,16);

  ctx.fillStyle = "#000000";
  ctx.font = "14px Verdana";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  drawText(hp+" / "+max,x+width/2,y);
  ctx.textAlign = "left";
}