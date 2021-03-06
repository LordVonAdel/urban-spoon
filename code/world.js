module.exports = function(generator,size){
  this.terrain = new Terrain(generator,size);
  this.gravity = 0.3;
  this.height = 1000;
  this.sync = function(lobby){
    lobby.broadcast('world',{nodes: this.terrain.nodes});
  }
}

function Terrain(generator,size){
  this.length = size;
  this.nodes = [];
  this.ppn = 8; //Pixel per node
  this.amplitude = 400;
  this.height = 1000;
  generators[generator](this);
}
Terrain.prototype.getWidth = function(){
  return this.nodes.length * this.ppn;
}

Terrain.prototype.getHeight = function(x) {
  var node1 = this.nodes[Math.floor(x/this.ppn)];
  var node2 = this.nodes[Math.ceil(x/this.ppn)];
  var l = x % this.ppn;
  return node1+((l/this.ppn) * (node2 - node1));
}

Terrain.prototype.getY = function(x){
  var node1 = this.nodes[Math.floor(x/this.ppn)];
  var node2 = this.nodes[Math.ceil(x/this.ppn)];
  var l = x % this.ppn;
  return (node1+((l/this.ppn) * (node2 - node1)))*this.amplitude;
}

Terrain.prototype.getSlope = function(x){
  var n1x = Math.floor(x/this.ppn);
  var n2x = Math.ceil(x/this.ppn);
  if (n1x == n2x){ //if the position is perfect on the node
    if(n1x == 0){ //go right when at 0 instead of left, because we don't want to go outside the bounds!
      n2x = 1;
    }else{
      n1x -= 1;
    }
  }
  var node1 = this.nodes[n1x]*this.amplitude;
  var node2 = this.nodes[n2x]*this.amplitude;
  return (node2-node1)/this.ppn;
}

Terrain.prototype.setHeightRegion = function(xMin, xMax, height) {
  for(var i = Math.floor(xMin / this.ppn); Math.ceil(i<xMax / this.ppn); i++){
    this.setNode(i,height);
  }
}

Terrain.prototype.addHeightRegion = function(xMin, xMax, height) {
  for(var i = Math.floor(xMin / this.ppn); Math.ceil(i<xMax / this.ppn); i++){
    this.addNode(i,height);
  }
}

Terrain.prototype.setYRegion = function(xMin, xMax, height) {
  for(var i = Math.floor(xMin / this.ppn); Math.ceil(i<xMax / this.ppn); i++){
    this.setNode(i,height/this.amplitude);
  }
}

Terrain.prototype.setNode = function(index, height){
  this.nodes[index] = height;
}

Terrain.prototype.addNode = function(index, height){
  this.nodes[index] += height;
}

Terrain.prototype.digTerrain = function(x, radius, power) {

}

generators = {
  random: function(terrain){
    for(var i=0; i<terrain.length; i++){
      terrain.setNode(i,Math.random());
    }
  },
  flat: function(terrain){
    for(var i=0; i<terrain.length; i++){
      terrain.setNode(i,0.5);
    }
  },
  berge: function(terrain){
    generateTerrainSin(terrain.length, 20, 0.6, terrain);
    shrink(terrain);
    roughness(0.003, terrain);
  },
  gauss: function(terrain){
    for (var i=0; i<terrain.length; i++){
      var x = -1+(i / terrain.length)*2;
      terrain.setNode(i, 4 / Math.sqrt(Math.PI/0.2)*Math.pow(Math.E,-(x*x/0.2)));
    }
    //shrink(terrain);
  }
}

function generateTerrainSin(width, parts, heightdiff, terrain) {
  var w = width/parts;
  var lastHeight = Math.random() * 0.5 + 0.25;

  for(var i=0; i<parts; i++){
    var newHeight = lastHeight + (Math.random() * heightdiff - (lastHeight*heightdiff));
    terrain.nodes = terrain.nodes.concat(generatePartSin(lastHeight, w, newHeight));
    lastHeight = newHeight;
  }
}

function generatePartSin(startY, width, endY){
  var strip = [];
  var height = endY - startY;
  for(var i=0; i<width; i++){
    strip[i] = -height/2 * (Math.cos(Math.PI*i/(width-1)) - 1) + startY;
  }
  return strip;
}

function roughness(roughness, terrain) {
  for(var i=0; i<terrain.nodes.length-1; i++){
    terrain.nodes[i] = terrain.nodes[i] + Math.random() * roughness;
  }
}

function shrink(terrain) {
  for(var i=0; i<terrain.nodes.length; i++){
    terrain.nodes[i] = terrain.nodes[i] * 0.8 + 0.1;
  }
}