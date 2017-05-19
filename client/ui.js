uiEntAlpha = 0;

function drawUI(){

  if (placement != null){
    drawPlacement(mouseX,mouseH,placement.sprite);
    ctx.font = "30px Verdana";
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline="top";
    ctx.fillText(placement.text,10,10);
    if (keyCheckPressed("M0")){
      socket.emit('place',{x: mouseX, y: 0, type: placement.type});
      placement = null;
    }
  }

  ctx.globalAlpha = uiEntAlpha;
  ctx.fillStyle = "#232323";
  ctx.fillRect(0,0,window.innerWidth,64);

  if (selectedEntUI != null){
    var x = 10;
    var y = 0;

    function nextBlock(){
      x += 256;
      y = 0;
    }

    uiEntAlpha = transitionLinear(uiEntAlpha,1,0.1);
    ctx.font = "24px Verdana";
    ctx.textBaseline="top";
    ctx.fillStyle = teamColors[selectedEnt.team];
    ctx.fillText(teamNames[selectedEnt.team],x,y);
    nextBlock();
    ctx.fillStyle = "#ffffff";
    ctx.fillText(selectedEntUI.name,x,y);
    ctx.fillText("HP: "+selectedEntUI.hp+" / "+selectedEntUI.hpMax,x,y+32);
    nextBlock();
    for (var i=0; i<selectedEntUI.options.length; i++){
      var option = selectedEntUI.options[i];
      if (option.type == "vehicle"){
        ctx.fillStyle = "#00ffff";
      }
      else if (option.type == "ability"){
        ctx.fillStyle = "#00ff00";
      }

      //hover animation for options
      if (mouseOverUI(x,y,x+256,y+64,option)){
        option.hoverFrame = transitionLinear(option.hoverFrame,1,0.1);
        if (keyCheckPressed("M0")){//left click on option
          socket.emit('a',i);
        }
      }else{
        option.hoverFrame = transitionLinear(option.hoverFrame,0,0.1);
      }
      
      ctx.globalAlpha = 0.2 + option.hoverFrame*0.7;
      ctx.fillRect(x,y,256,64);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#000000";
      ctx.fillText(option.name,x+2,y+2);
      ctx.fillText(option.costs,x+2,y+32);

      if (option.type == "vehicle"){
        drawSpriteUI(x+256-32,y,"sprites/ui/iconVehicle.png");
      }
      else if (option.type == "ability"){
        drawSpriteUI(x+256-32,y,"sprites/ui/iconEffect.png");
      }

      nextBlock();

    }
  }else{
    uiEntAlpha = transitionLinear(uiEntAlpha,0,0.1);
  }
  ctx.globalAlpha = 1;
}

function transitionLinear(current,target,step){
   if( Math.abs(current-target)<step){return target}
   return current + Math.sign(target-current)*step;
}

function drawSpriteUI(x,y,sprite){
  if (sprites[sprite] == undefined){
    sprites[sprite] = new Image();
    sprites[sprite].src = sprite;
  }
  ctx.drawImage(sprites[sprite],x,y);
}