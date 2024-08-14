//
//  File Name:  script.js (for light ray)
//  Author:     Artem Suprun
//  Date:       06/14/2022
//  Summary:    A JS script file for the light ray folder, which runs a
//              program on the javascript canvas.
//


// GameLoop
class CanvasLoop {
  // public class functions: 
  constructor(canvas, context = '2d') {
    // variables 
    this.canvas = null;
    this.ctx = null;
    
    // initializing canvas and context
    this.canvas = document.getElementById(canvas);
    if (!(this.canvas))
      throw new Error('Failed to get canvas ID');
    
    this.ctx = this.canvas.getContext(context);
    if (!(this.ctx))
      throw new Error('Failed to get the get canvas context/context does not exist');
    
    // initialize public variables
    this.bg = null;
    this.w = this.canvas.width;
    this.h = this.canvas.height;
  }
  
  setSize(w, h) {
    // validate the parameters
    if (w < 0 || h < 0)
      throw new Error('invalid canvas size');
    
    // setting the values
    this.canvas.width = w;
    this.canvas.height = h;
    
    this.w = this.canvas.width;
    this.h = this.canvas.height;
  }
  
  setBackground(bg) {
    // check if the user wants a background
    if (!bg) {
      this.bg = null;
    }
    else {
      // validate the given color
      let style = new Option().style;
      style.color = bg;
      if (style.color == '')
        throw new Error('Invalid background color');
      
      this.bg = bg;
    }
  }
  
  // this function clears up the frame.
  clear() {
    if (!this.bg) {
      this.ctx.clearRect(0, 0, this.w, this.h);
    }
    else {
      // fill the background instead of clearing it
      this.ctx.fillStyle = this.bg;
      this.ctx.fillRect(0, 0, this.w, this.h);
  //ctx.fillRect(-canvas.width, -canvas.height, canvas.width*2, canvas.height*2);
    }
  }
  
  // this function is used to setup objects before the loop starts,
  //   such as generating walls, etc..
  setup(...args) {
    // setup the objects
    for (let arg of args)
      arg.setup(this.canvas, this.ctx);
  }
  
  // this function is used to draw objects into the canvas during looping.
  draw(...args) {
    for (let arg of args) 
      arg.draw(this.canvas, this.ctx);
  }
  
  update(...args) {
    for (let arg of args)
      arg.update(this.canvas)
  }
}

// Ray class for the dot to act like a view ray
class Ray {
  constructor (x, y, angle, color) {
    this.x = x;
    this.y = y;
    this.a = angle;
    this.dx = Math.cos(this.a) + this.x;
    this.dy = Math.sin(this.a) + this.y;
    this.color = color;
    this.width = 2;
  }
  
  draw(canvas, ctx) {
    // draw the individual ray
    let oldWidth = ctx.lineWidth;
    ctx.lineWidth = this.width;
    
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.dx, this.dy);
    ctx.strokeStyle = this.color;
    ctx.stroke();
    ctx.closePath();
  }
  
  update(canvas) {}
  
  rayAt(x3, x4, y3, y4) {
    // initialize variables
    let den, t, u;
    
    // update the current directions 
    this.dx = Math.cos(this.a) + this.x;
    this.dy = Math.sin(this.a) + this.y;
    
    // the math used to find the point
    den = ((this.x - this.dx) * (y3 - y4)) - ((this.y - this.dy) * (x3 - x4));
    if (den) {
      t = ((this.x - x3) * (y3 - y4)) - ((this.y - y3) * (x3 - x4));
      t /= den;
      u = -1 * (((this.x - this.dx) * (this.y - y3)) - ((this.y - this.dy) * (this.x - x3)));
      u /= den;
      
      // verify it
      if ((0 <= u && u <= 1) && 0 <= t) 
        return [this.x + (t * (this.dx - this.x)), this.y + (t * (this.dy - this.y))];
    }
    return null;
  }
  
  rayLength() {
    // initialize variables
    let a = (this.x - this.dx);
    let b = (this.y - this.dy);
    
    // find the distance between the two points to find the shortest one
    return Math.round(Math.sqrt( a*a + b*b ));
  }
  
  rayWalls(walls) {
    // initialize needed variables
    let d, x_temp, y_temp;
    let point = [];
    let shortest = 10000;
    
    // loop through walls to find intersecting lines
    for (let i = 0; i < walls.length; ++i) {
      
      // get the point at which the ray hits the wall
      point = this.rayAt(walls[i].x1, walls[i].x2, walls[i].y1, walls[i].y2);
        
      // verify it
      if (point != null) {
        this.dx = point[0];
        this.dy = point[1];
        
        // get the current ray's line length
        d = this.rayLength();
        
        // keep record of the shortest path
        if (d < shortest) {
          shortest = d;
          x_temp = this.dx;
          y_temp = this.dy;
        }
      }
    }
    // set cords to the closest wall
    this.dx = x_temp;
    this.dy = y_temp;
  }
}


// Dot class to represent a player
class Dot {
  constructor(x = 0, y = 0, size = 10, color = 'red') {
    // validating and initializing variables
    if (size < 0)
      throw new Error('cannot set dot size below zero');
    this.r = size;

    // validate the given color
    let style = new Option().style;
    style.color = color;
    if (style.color == '')
      throw new Error('Invalid background color');
    this.color = color;

    this.x = x;
    this.y = y;
    this.a = Math.PI;
    this.fov = Math.PI/2;
    this.render = 50;
    this.speed = 1;
    this.rays = [];
    this.rayColor = 'black';
    this.move = [false, false, false, false];
  }
  
  draw(canvas, ctx) {
    // draw the rays on the player
    for (let i = 0; i < this.rays.length; ++i) 
      this.rays[i].draw(canvas, ctx);
    
    // draw the dot itself
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, 2*Math.PI);
    ctx.fillStyle = this.color;
    ctx.fill();
  }
  
  update(canvas) {
    this.movement();
    for (let i = 0; i < this.rays.length; ++i) {
      this.rays[i].x = this.x;
      this.rays[i].y = this.y;
      this.rays[i].update(canvas);
    }
  }
  
  setup(canvas, ctx) {
    // setting up the dot's view range
    let rangeStart = -1*this.fov/2 + this.a;
    let rangeEnd = this.fov/2 + this.a;
    
    // setting up the dot's rays
    let a;
    for (a = rangeStart; a < rangeEnd; a += (Math.PI/16))
      this.rays[this.rays.length] = new Ray(this.x, this.y, a, this.rayColor);
    // add the last ray
    this.rays.push(new Ray(this.x, this.y, a, this.rayColor));
    
    // draw the dot's center 
    this.rays.push(new Ray(this.x, this.y, (rangeStart + rangeEnd)/2, 'red'));
  }
  
  movement() {
    if (this.move[0] == true)
      this.x -= this.speed;
    if (this.move[1] == true)
      this.y -= this.speed;
    if (this.move[2] == true)
      this.x += this.speed;
    if (this.move[3] == true)
      this.y += this.speed;
  }
  
  detectWall(...walls) {
    for (let i = 0; i < this.rays.length; ++i) 
      this.rays[i].rayWalls(walls);
  }
}


// wall
class Wall {
  constructor(x1, y1, x2, y2, color) {
    this.color = color;
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
  }
  
  draw(canvas, ctx) {
    ctx.beginPath();
    ctx.moveTo(this.x1, this.y1);
    ctx.lineTo(this.x2, this.y2);
    ctx.strokeStyle = this.color;
    ctx.stroke();
  }
}

let canvas = new CanvasLoop('cvs');
canvas.setSize(500, 500);
let dot = new Dot(canvas.w/2, canvas.h/2);
const walls = [];
walls.push(new Wall(100, 100, 200, 100, 'black'));
walls.push(new Wall(200, 100, 200, 150, 'black'));
walls.push(new Wall(200, 150, 100, 150, 'black'));
walls.push(new Wall(100, 150, 100, 100, 'black'));

walls.push(new Wall(10, 10, canvas.w-10, 10, 'black'));
walls.push(new Wall(canvas.w-10, 10, canvas.w-10, canvas.h-10, 'black'));
//walls.push(new Wall(canvas.w-10, canvas.h-10, 10, canvas.h-10, 'black'));
walls.push(new Wall(10, canvas.h-10, 10, 10, 'black'));

walls.push(new Wall(100, 200, 100, canvas.h-100, 'black'));
walls.push(new Wall(100, 200, canvas.w-200, canvas.h-100, 'black'));


// for the ray casting
let ray_cast = new CanvasLoop('rays');
ray_cast.setBackground('black');


// controls
document.addEventListener("keydown", keyDownHandler, false);
function keyDownHandler(e) {
  // constrols for the dot
  i = e.keyCode - 37;
  if (i >= 0 && i <= 3) 
    dot.move[i] = true;
}
document.addEventListener("keyup", keyUpHandler, false);
function keyUpHandler(e) {
  // constrols for the dot
  i = e.keyCode - 37;
  if (i >= 0 && i <= 3) 
    dot.move[i] = false;
}


canvas.setup(dot);
window.requestAnimationFrame(loop);

function loop() {
  canvas.clear();
  canvas.draw(dot, ...walls);
  //dot.movement();
  canvas.update(dot);
  //canvas.draw(ray);
  dot.detectWall(...walls);
  
  
  ray_cast.clear();
  
  
  // keep requesting new frames
  window.requestAnimationFrame(loop);
}

