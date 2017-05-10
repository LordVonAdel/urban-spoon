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
    var maxH = 400; //maximum height
    var h = maxH/2;
    var s = 0;
    for(var i=0; i<terrain.length; i++){
      terrain.nodeSet(i,h);
      s+=Math.random()*8-4+(-8*((h/maxH)-0.5));
      s=Math.min(30,Math.max(s,-30));
      h+=s;
      h = Math.min(maxH-30,Math.max(h,30));
    }
  }
}
