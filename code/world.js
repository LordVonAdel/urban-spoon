module.exports = function(seed, generator){
  this.terrain = new Terrain(seed, generator);
}

function Terrain(seed, generator){
  this.length = 500;

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

  generators["berge"](this);
}

generators = {
  random: function(terrain){

  },
  berge: function(terrain){
    var h = 0.5;
    var s = 0;
    for(var i=0; i<terrain.length; i++){
      terrain.nodeSet(i,h);
      s+=Math.random()*0.05-0.025-(0.05*(h-0.5));
      s=Math.min(0.2,Math.max(s,-0.2));
      h+=s;
      h = Math.min(0.95,Math.max(h, 0.05));
    }
  }
}
