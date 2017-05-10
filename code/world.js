module.exports = function(seed){
  this.terrain = new Terrain();

  this.getHeight = function(x) {
    this.terrain.getHeight(x);
  }

  this.setHeight = function(xMin, xMax, height) {
    this.terrain.setHeight(xMin, xMax, height);
  }

  this.addHeight = function(xMin, xMax, height) {
    this.terrain.addHeight(xMin, xMax, height);
  }

  this.digTerrain = function(x, radius, power) {
    this.terrain.digTerrain(x, radius, power);
  }
}

function Terrain(seed){

  this.getHeight = function(x) {

  }

  this.setHeight = function(xMin, xMax, height) {

  }

  this.addHeight = function(xMin, xMax, height) {
      
  }

  this.digTerrain = function(x, radius, power) {

  }
}
