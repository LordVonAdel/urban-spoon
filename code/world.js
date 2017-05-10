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
    for(var i=0; i<100; i++){
      terrain[i] = h;
      s+=Math.random()*0.01-0.005+(-0.01*(h-0.5));
      s=Math.min(0.03,Math.max(s,-0.03));
      h+=s;
      h=Math.min(0.95,Math.max(h,0.05));
    }
  }
}
