//
//  File Name:  script.js (for light ray)
//  Author:     Artem Suprun
//  Date:       08/16/2024 (last modified 10/17/2026)
//  Summary:    A JS script file for the light ray folder, which runs a
//              program on the javascript canvas.
//

// Requires two canvas elements in your HTML:
// <canvas id="cvs"></canvas>   <!-- 2D map -->
// <canvas id="rays"></canvas>  <!-- 3D view -->


// Game
// Coordinates input, updates, rendering, and the game loop.
class Game {
  constructor(player, world, raycaster, mapView, sceneView) {
    this.player = player;
    this.world = world;
    this.raycaster = raycaster;
    this.mapView = mapView;
    this.sceneView = sceneView;

    this.keys = new Set();
    this.handledKeys = new Set([
      "arrowleft", "arrowright", "arrowup", "arrowdown",
      "w", "a", "s", "d"
    ]);

    this.lastTimestamp = null;
    this.animationFrameId = null;
    this.isRunning = false;

    // Create the callback once so it can also be cancelled.
    this.boundGameLoop = this.gameLoop.bind(this);

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.clearKeys = this.clearKeys.bind(this);

    this.setupInput();
  }

  // Sets up event listeners for keyboard input.
  setupInput() {
    document.addEventListener("keydown", this.handleKeyDown);
    document.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("blur", this.clearKeys);
  }

  // Handles keydown events and adds the key to the set of pressed keys.
  handleKeyDown(event) {
    const key = event.key.toLowerCase();

    if (!this.handledKeys.has(key)) return;

    event.preventDefault();
    this.keys.add(key);
  }

  // Handles keyup events and removes the key from the set of pressed keys.
  handleKeyUp(event) {
    const key = event.key.toLowerCase();

    if (!this.handledKeys.has(key)) return;

    event.preventDefault();
    this.keys.delete(key);
  }

  // Clears all pressed keys, typically called when the window loses focus.
  clearKeys() {
    this.keys.clear();
  }

  // Starts the game loop.
  start() {
    // Prevent accidentally starting multiple game loops.
    if (this.isRunning) return;

    this.isRunning = true;
    this.lastTimestamp = null;
    this.animationFrameId = requestAnimationFrame(this.boundGameLoop);
  }

  // Stops the game loop and clears input state.
  stop() {
    this.isRunning = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.clearKeys();
    this.lastTimestamp = null;
  }

  // The main game loop, called once per animation frame.
  gameLoop(timestamp) {
    if (!this.isRunning) return;

    // Calculate the time delta since the last frame in seconds.
    let dt = 0;
    if (this.lastTimestamp !== null) {
      const elapsedSeconds = (timestamp - this.lastTimestamp) / 1000;

      // Avoid large movement jumps after a stalled frame.
      dt = Math.min(elapsedSeconds, 0.05);
    }
    this.lastTimestamp = timestamp;

    // Update game state and render the scene.
    this.update(dt);
    this.render();

    if (this.isRunning) 
      this.animationFrameId = requestAnimationFrame(this.boundGameLoop);
  }

  // Updates the game state based on input and elapsed time.
  update(dt) {
    this.player.update(dt, this.keys, this.world);
  }

  // Renders the 3D view and the 2D map.
  render() {
    this.sceneView.clear();
    this.raycaster.render3D(this.sceneView.ctx, this.sceneView.width, this.sceneView.height);
    this.drawMap();
  }

  // Draws the 2D map, including walls, rays, and the player.
  drawMap() {
    this.mapView.clear();
    const ctx = this.mapView.ctx;
    this.world.draw(ctx);
    this.raycaster.drawMapRays(ctx);
    this.player.draw(ctx);
  }

  // Cleans up event listeners and stops the game loop.
  destroy() {
    this.stop();

    document.removeEventListener(
      "keydown", this.handleKeyDown
    );
    document.removeEventListener(
      "keyup", this.handleKeyUp
    );
    window.removeEventListener("blur", this.clearKeys);
  }
}


// CanvasView
// Manages a canvas, its drawing context, and its background.
class CanvasView {
  constructor(id, background = null, width = 500, height = 500) {
    this.canvas = document.getElementById(id);

    if (!this.canvas) 
      throw new Error(`Canvas element "${id}" was not found.`);

    this.ctx = this.canvas.getContext("2d");

    if (!this.ctx) 
      throw new Error(`Could not create a 2D context for "${id}".`);

    this.background = background;
    this.resize(width, height);
  }

  // Resizes the canvas and updates its width and height properties.
  resize(width, height) {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0)
      throw new RangeError("Canvas dimensions must be positive numbers.");

    this.canvas.width = width;
    this.canvas.height = height;

    this.width = width;
    this.height = height;
  }

  // Clears the canvas, filling it with the background color if specified.
  clear() {
    if (this.background !== null) {
      this.ctx.fillStyle = this.background;
      this.ctx.fillRect(0, 0, this.width, this.height);
    } else {
      this.ctx.clearRect(0, 0, this.width, this.height);
    }
  }
}


// Raycaster
// Casts rays against the world and renders the 3D view.
class Raycaster {
  constructor(player, world, options = {}) {
    this.player = player;
    this.world = world;

    this.maxDistance = options.maxDistance ?? 800;
    this.rayCount = options.rayCount ?? 320;

    if (!Number.isFinite(this.maxDistance) || this.maxDistance <= 0)
      throw new RangeError("maxDistance must be positive.");

    if (!Number.isInteger(this.rayCount) || this.rayCount <= 0) 
      throw new RangeError("rayCount must be a positive integer.");

    this.lastHits = [];
  }

  // Finds the closest wall intersection along one ray.
  castRay(angle) {
    const px = this.player.x;
    const py = this.player.y;

    const rayX = Math.cos(angle);
    const rayY = Math.sin(angle);

    let closestHit = null; // Stores the closest intersection found so far.

    // Check each wall for intersection with the ray.
    for (const wall of this.world.walls) {
      const wallX = wall.x2 - wall.x1;
      const wallY = wall.y2 - wall.y1;

      const offsetX = wall.x1 - px;
      const offsetY = wall.y1 - py;

      // 2D cross product.
      const denominator = rayX * wallY - rayY * wallX;

      // Parallel lines do not have a unique intersection.
      if (Math.abs(denominator) < 1e-9) 
        continue;

      const distance = (offsetX * wallY - offsetY * wallX) / denominator;

      const wallPosition = (offsetX * rayY - offsetY * rayX) / denominator;

      // distance: position along the ray.
      // wallPosition: position along the wall segment.
      if (distance < 0 || distance > this.maxDistance || wallPosition < 0 || wallPosition > 1) 
        continue;

      // If this intersection is closer than any previously found, store it.
      if (closestHit === null || distance < closestHit.distance) {
        closestHit = {
          x: px + rayX * distance,
          y: py + rayY * distance,
          distance,
          wall
        };
      }
    }

    return closestHit;
  }

  // Casts rays across the player's field of view.
  castAll() {
    const hits = [];
    const startAngle = this.player.angle - this.player.fov / 2;
    const angleStep = this.player.fov / this.rayCount;

    // Cast each ray and store the results.
    for (let i = 0; i < this.rayCount; i++) {
      const angle = startAngle + (i + 0.5) * angleStep;

      hits.push({
        angle,
        hit: this.castRay(angle)
      });
    }

    this.lastHits = hits;
    return hits;
  }

  // Draws the rays on the 2D map for visualization.
  drawMapRays(ctx) {
    ctx.save();

    ctx.strokeStyle = "rgba(255, 50, 50, 0.20)";
    ctx.lineWidth = 2;

    // Draw each ray from the player to its endpoint.
    for (const { angle, hit } of this.lastHits) {
      let endX;
      let endY;

      if (hit) {
        // If the ray hit a wall, use the hit position.
        endX = hit.x;
        endY = hit.y;
      } else {
        // If the ray hit nothing, extend it to its maximum distance.
        endX = this.player.x + Math.cos(angle) * this.maxDistance;
        endY = this.player.y + Math.sin(angle) * this.maxDistance;
      }

      // Draw a ray from the player to its endpoint.
      ctx.beginPath();
      ctx.moveTo(this.player.x, this.player.y);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }

    ctx.restore();
  }

  // Renders the 3D view based on the rays cast and their intersections with walls.
  render3D(ctx, width, height) {
    this.drawBackground(ctx, width, height);

    const hits = this.castAll();
    const columnWidth = width / hits.length;
    
    const projectionPlane = width / (2 * Math.tan(this.player.fov / 2));
    const wallWorldHeight = 15;

    // Draw each vertical slice of the 3D view.
    for (const [index, ray] of hits.entries()) {
      const { angle, hit } = ray;

      if (!hit) continue;

      const correctedDistance = Math.max(
        0.001,
        hit.distance * Math.cos(angle - this.player.angle)
      );

      const wallHeight = Math.min(
        height * 2,
        wallWorldHeight * projectionPlane / correctedDistance
      );

      const top = (height - wallHeight) / 2;

      const brightness = this.getWallBrightness(
        hit.wall,
        correctedDistance
      );

      ctx.fillStyle =`rgb(${brightness}, ${brightness}, ${brightness})`;
      ctx.fillRect(
        index * columnWidth,
        top,
        Math.ceil(columnWidth) + 1,
        wallHeight
      );
    }
  }

  // Draws the ceiling and floor of the 3D view.
  drawBackground(ctx, width, height) {
    // Ceiling.
    ctx.fillStyle = "#252932";
    ctx.fillRect(0, 0, width, height / 2);

    // Floor.
    ctx.fillStyle = "#4b4a45";
    ctx.fillRect(0, height / 2, width, height / 2);
  }

  // Returns a brightness value for a wall based on its distance and orientation.
  getWallBrightness(wall, distance) {
    const shade = Math.max(
      35,
      Math.min(255, 255 * (1 - distance / this.maxDistance))
    );

    // Give horizontal and vertical walls different shading.
    const dx = wall.x2 - wall.x1;
    const dy = wall.y2 - wall.y1;

    const isVertical = Math.abs(dx) < Math.abs(dy);

    return Math.round(isVertical ? shade : shade * 0.78);
  }
}


// World
// Owns the walls and handles world-level collision checks.
class World {
  constructor(walls) {
    this.walls = walls;
  }

  // Draws all walls in the world.
  draw(ctx) {
    for (const wall of this.walls) {
      wall.draw(ctx);
    }
  }

  // Returns true if a circle at (x, y) with the given radius collides with any wall.
  collidesWithWalls(x, y, radius) {
    for (const wall of this.walls) {
      const distance = distancePointToSegment(
        x, y,
        wall.x1, wall.y1,
        wall.x2, wall.y2
      );

      if (distance < radius) 
        return true;
    }

    return false;
  }
}


// Player
// Stores player position, orientation, and movement behavior.
class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;

    this.radius = 5;
    this.angle = -Math.PI / 2;
    this.fov = Math.PI / 3;

    this.speed = 40;
    this.turnSpeed = 2.2;
  }

  // Draws the player on the 2D map.
  draw(ctx) {
    ctx.save();

    // Player body.
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Direction indicator.
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(
      this.x + Math.cos(this.angle) * 22,
      this.y + Math.sin(this.angle) * 22
    );
    ctx.stroke();

    ctx.restore();
  }

  // Updates the player's position and orientation based on input.
  update(dt, keys, world) {
    this.updateRotation(dt, keys);
    this.updateMovement(dt, keys, world);
  }

  // Updates the player's orientation based on input.
  updateRotation(dt, keys) {
    if (keys.has("arrowleft") || keys.has("a")) {
      this.angle -= this.turnSpeed * dt;
    }

    if (keys.has("arrowright") || keys.has("d")) {
      this.angle += this.turnSpeed * dt;
    }
  }

  // Updates the player's position based on input and collision detection.
  updateMovement(dt, keys, world) {
    let forward = 0;

    if (keys.has("arrowup") || keys.has("w")) 
      forward += 1;

    if (keys.has("arrowdown") || keys.has("s")) 
      forward -= 1;

    if (forward === 0) 
      return;

    const distance = forward * this.speed * dt;
    const nextX = this.x + Math.cos(this.angle) * distance;
    const nextY = this.y + Math.sin(this.angle) * distance;

    // Test each axis independently to allow wall sliding.
    if (!world.collidesWithWalls(nextX, this.y, this.radius))
      this.x = nextX;

    if (!world.collidesWithWalls(this.x, nextY, this.radius)) 
      this.y = nextY;
  }
}


// Wall
// Represents one line segment in the 2D world.
class Wall {
  constructor(x1, y1, x2, y2, color = "White") {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.color = color;
  }

  // Draws the wall on the 2D map.
  draw(ctx) {
    ctx.save();

    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(this.x1, this.y1);
    ctx.lineTo(this.x2, this.y2);
    ctx.stroke();

    ctx.restore();
  }
}


// Utility functions

// Returns the shortest distance between a point and a segment.
function distancePointToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;

  const lengthSquared = dx * dx + dy * dy;

  // Handle a segment whose endpoints are identical.
  if (lengthSquared === 0) 
    return Math.hypot(px - x1, py - y1);

  // Project the point onto the segment and clamp the result
  // so the closest point cannot extend beyond either endpoint.
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared));
  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;

  return Math.hypot(px - closestX, py - closestY);
}


// Initialization

const mapView = new CanvasView("cvs", null, 500, 500);
const sceneView = new CanvasView("rays", "#111111", 800, 500);

const walls = [
  // Outer boundary.
  new Wall(10, 10, 480, 10),
  new Wall(490, 20, 490, 490),
  new Wall(490, 490, 10, 490),
  new Wall(10, 490, 10, 10),

  // Internal room.
  new Wall(100, 100, 200, 100),
  new Wall(200, 100, 200, 150),
  new Wall(200, 150, 100, 150),
  new Wall(100, 150, 100, 100),

  // Corridor.
  new Wall(100, 200, 100, 400),
  new Wall(100, 400, 300, 400)
];

const world = new World(walls);
const player = new Player(250, 250);

const raycaster = new Raycaster(player, world, {rayCount: 320, maxDistance: 800});

const game = new Game(
  player,
  world,
  raycaster,
  mapView,
  sceneView
);

game.start();
