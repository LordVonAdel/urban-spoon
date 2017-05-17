uiEntAlpha = 0;

function drawUI(){

  if(placement != null){
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

  if (selectedEntUI != null){
    uiEntAlpha = transitionLinear(uiEntAlpha,1,0.1);
    ctx.globalAlpha = uiEntAlpha;
    ctx.fillStyle = "#232323";
    ctx.fillRect(0,0,256,window.innerHeight);

    ctx.font = "24px Verdana";
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline="top";
    ctx.fillText(selectedEntUI.name,10,10);
    ctx.fillText("HP: "+selectedEntUI.hp+" / "+selectedEntUI.hpMax,10,44);
  }else{
    uiEntAlpha = transitionLinear(uiEntAlpha,0,0.1);
  }
  ctx.globalAlpha = 1;
}
function transitionLinear(current,target,step){
   if( Math.abs(current-target)<step){return target}
   return current + Math.sign(target-current)*step;
}