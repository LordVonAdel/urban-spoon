module.exports = function(seed, generator){
  this.terrain = new Terrain(seed, generator);
}

function Terrain(seed, generator){
  this.length = 500;
  this.nodes = [];

  this.getHeight = function(x) {

  }

  this.setHeight = function(xMin, xMax, height) {

  }

  this.nodeSet = function(index, height){

  }

  this.nodeAdd = function(index, height){
    
  }

  this.addHeight = function(xMin, xMax, height) {
      
  }

  this.digTerrain = function(x, radius, power) {

  }

  generators["berge"](this.nodes);
}

generators = {
  random: function(nodes){

  },
  berge: function(nodes){
    var h = Math.random()*0.5+0.25;
    var s = Math.random()*0.05-0.025;
    for(var i=0; i<100; i++){
      nodes[i] = h;
      var v = h-0.5;
      s+=Math.random()*0.01-0.005-(0.01*(Math.sign(v)*Math.sqrt(Math.abs(v))));
      s=Math.min(0.03,Math.max(s,-0.03));
      h+=s;
      h=Math.min(0.95,Math.max(h,0.05));
    }
  }
}
