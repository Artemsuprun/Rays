//
//  File Name:  script.js
//  Author:     Artem Suprun
//  Date:       06/14/2022
//  Summary:    A JS script file for the rain folder, which runs a
//              program on the javascript canvas.
//


// player
class Player {
  constructor(x, y, size, color, render) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.color = color;
    this.render = render;
    this.speed = 1;
  }
}


// ray
class Ray {
  constructor (x1, y1, rotate, color) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = 0;
    this.y2 = 0;
    this.a = angle;
    this.color = color;
  }
}


// wall
class Wall {
  constructor(color, x1, y1, x2, y2) {
    this.color = color;
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
  }
}




// global variables
  // canvas
const canvas = document.getElementById("cvs");
const ctx = canvas.getContext("2d");
const walls = [];
const player = new Player();
const rays = [];

// controls
const movementSet = [false, false, false, false];
document.addEventListener("keydown", keyDownHandler, false);
function keyDownHandler(e) {
  i = e.keyCode - 37;
  if (i >= 0 && i <= 3) 
    movementSet[i] = true;
}
document.addEventListener("keyup", keyUpHandler, false);
function keyUpHandler(e) {
  i = e.keyCode - 37;
  if (i >= 0 && i <= 3) 
    movementSet[i] = false;
}

// background() function to set canvas color
const background = (color) => {
  ctx.fillStyle = color;
  ctx.fillRect(-canvas.width, -canvas.height, canvas.width*2, canvas.height*2);
}

// setSize(), set canvas size
function setSize(x, y) {
  ctx.canvas.width = x;
  ctx.canvas.height = y;
}


// returns a random int between the min and max
function getRndInt(min, max)
{
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// populate the canvase with walls
function generateWalls(num, width, height, walls) {
  let x1, y1, x2, y2;
  for (let i = 0; i < num; ++i) {
    x1 = getRndInt(0, width);
    y1 = getRndInt(0, height);
    x2 = getRndInt(0, width);
    y2 = getRndInt(0, height);
    walls[walls.length] = new Wall("white", x1, y1, x2, y2);
  }
}

// detects walls
function detectWall(walls, rays) {
  let t, u;
  // check each wall
  for (let i = 0; i < walls.length; ++i) {
    
  }
}

// setup the player attributes
function playerSetup(player) {
  player.x = canvas.width/2;
  player.y = canvas.height/2;
  player.size = 5;
  player.render = 200;
  player.color = 'red';
  player.speed = 1.2;
  
  // setting up the player's rays
  for (let i = 0; i < (2*Math.PI); i += (Math.PI/200)) {
    rays[rays.length] = new Ray(player.x, player.y, i, 'gold');
  }
}



// Setup (permanant structures for draw)
function setup() {
  // canvas size
  setSize(500, 500);
  // walls generation
  generateWalls(10, canvas.width, canvas.height, walls);
  // spawn in player
  playerSetup(player);
  
  // start the first frame request
  window.requestAnimationFrame(draw);
}

let secondsPassed, oldTimeStamp, fps;
// Draw
function draw(timeStamp) {
  // fps
  secondsPassed = (timeStamp - oldTimeStamp) / 1000;
  oldTimeStamp = timeStamp;
  fps = Math.round(1 / secondsPassed);
  //console.log(fps+" fps");
  
  // clear()
  background("black");

  // draw the walls
  for (let i = 0; i < walls.length; ++i) {
    ctx.beginPath();
    ctx.moveTo(walls[i].x1, walls[i].y1);
    ctx.lineTo(walls[i].x2, walls[i].y2);
    ctx.strokeStyle = walls[i].color;
    ctx.lineWidth = 5;
    ctx.stroke();
  }
  
  // move the player also
  //player.movement(movementSet);
  if (movementSet[0] == true)
    player.x -= player.speed;
  if (movementSet[1] == true)
    player.y -= player.speed;
  if (movementSet[2] == true)
    player.x += player.speed;
  if (movementSet[3] == true)
    player.y += player.speed;
  
  // draw the rays from the player's position
  ctx.lineWidth = 2;
  for (let i = 0; i < rays.length; ++i) {
    ctx.beginPath();
    ctx.moveTo(rays[i].x1, rays[i].y1);
    ctx.lineTo(rays[i].x2, rays[i].y2);
    ctx.strokeStyle = rays[i].color;
    ctx.stroke();
    ctx.closePath();
  }
  //move the rays
  var opp = 0;
  var adj = 0;
  for (let i = 0; i < rays.length; ++i) {
    rays[i].x1 = player.x;
    rays[i].y1 = player.y;
    adj = player.x + (Math.cos(rays[i].rotate) * player.render);
    opp = player.y + (Math.sin(rays[i].rotate) * player.render);
    rays[i].x2 = adj;
    rays[i].y2 = opp;
  }
  
  //block the rays with detection
  var t, u, x1, x2, x3, x4, y1, y2, y3, y4;
  var p = [0, 0];
  for (let i = 0; i < rays.length; ++i) {
    for (let j = 0; j < walls.length; ++j) {
      x1 = rays[i].x1;
      x2 = rays[i].x2;
      y1 = rays[i].y1;
      y2 = rays[i].y2;
      x3 = walls[j].x1;
      x4 = walls[j].x2;
      y3 = walls[j].y1;
      y4 = walls[j].y2;
      
      t = ((x1 - x3) * (y3 - y4)) - ((y1 - y3) * (x3 - x4));
      t /= ((x1 - x2) * (y3 - y4)) - ((y1 - y2) * (x3 - x4));
      
      u = -1 * (((x1 - x2) * (y1 - y3)) - ((y1 - y2) * (x1 - x3)));
      u /= ((x1 - x2) * (y3 - y4)) - ((y1 - y2) * (x3 - x4));
      
      if ( (0 <= t && t <= 1) && (0 <= u && u <= 1)) {
        rays[i].x2 = x1 + (t * (x2 - x1));
        rays[i].y2 = y1 + (t * (y2 - y1));
      }
    }
  }
  // draw the player
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.size, 0, 2*Math.PI);
  ctx.fillStyle = player.color;
  ctx.fill();
  
  // keep requesting new frames
  window.requestAnimationFrame(draw);
}

// The main output
setup();

// old way of frames
//var interval = setInterval(draw, 10);

