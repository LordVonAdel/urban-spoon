module.exports = function(seed, generator){
  this.terrain = new Terrain(seed, generator);
  this.sync = function(lobby){
    lobby.broadcast('world',{nodes: this.terrain.nodes});
  }
}

function Terrain(seed, generator){
  this.length = 500;
  this.nodes = [];
  this.ppn = 8; //Pixel per node
  this.height = 0;
  this.amplitude = 400;

  this.getHeight = function(x) {
    var node1 = this.nodes[Math.floor(x/this.ppn)];
    var node2 = this.nodes[Math.ceil(x/this.ppn)];
    var l = x % this.ppn;
    return node1+((l/this.ppn) * (node2 - node1));
  }

  this.getY = function(x){
    var node1 = this.nodes[Math.floor(x/this.ppn)];
    var node2 = this.nodes[Math.ceil(x/this.ppn)];
    var l = x % this.ppn;
    return (node1+((l/this.ppn) * (node2 - node1)))*this.amplitude;
  }

  this.setHeightRegion = function(xMin, xMax, height) {
    for(var i = Math.floor(xMin / this.ppn); Math.ceil(i<xMax / this.ppn); i++){
      this.setNode(i,height);
    }
  }
  
  this.addHeightRegion = function(xMin, xMax, height) {
    for(var i = Math.floor(xMin / this.ppn); Math.ceil(i<xMax / this.ppn); i++){
      this.addNode(i,height);
    }     
  }

  this.setYRegion = function(xMin, xMax, height) {
    for(var i = Math.floor(xMin / this.ppn); Math.ceil(i<xMax / this.ppn); i++){
      this.setNode(i,height/this.amplitude);
    }
  }

  this.setNode = function(index, height){
    this.nodes[index] = height;
  }

  this.addNode = function(index, height){
    this.nodes[index] += height;
  }

  this.digTerrain = function(x, radius, power) {

  }

  generators["berge"](this);
}

generators = {
  random: function(terrain){
    for(var i=0; i<terrain.length; i++){
      terrain.setNode(i,Math.random());
    }
  },
  berge: function(terrain){
    var h = Math.random()*0.5+0.25;
    var s = Math.random()*0.05-0.025;
    for(var i=0; i<terrain.length; i++){
      terrain.setNode(i,h);
      var v = h-0.5;
      s+=Math.random()*0.01-0.005-(0.01*(Math.sign(v)*Math.sqrt(Math.abs(v))));
      s=Math.min(0.03,Math.max(s,-0.03));
      h+=s;
      h=Math.min(0.95,Math.max(h,0.05));
    }
  }
}
