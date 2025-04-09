//ENVIRONMENT INITIALIZATION
//engine tool constants
const cs = new Canvas(document.getElementById("canvas"));
const rt = new RenderTool(cs);
const et = new EventTracker();
const tk = new Toolkit();
//canvas initialization
cs.setDimensions(window.innerWidth, window.innerHeight);

//GLOBAL VARIABLES
//freecam mode for debug
let freecam = true;
//epoch counter (ticks since game start)
let ec = 0;
//level counter
let levelCount = 0;
//current game state for script handling
let gameState = "homescreen";
//current level object or null when loading
let currentLevel = null;
//player object or null when loading
let player = null;
//landscape bool for multiplatform rendering
const landscape = cs.w > cs.h ? true : false;
//tilesize for rendering tiles
const tileSize = Math.floor(landscape ? cs.w / 30 : cs.h / 30);

//CLASSES
//player class
class Player {
  constructor(transform) {
    this.transform = transform;
    this.shape = new Shape([
      tk.calcRotationalTranslate(0, tileSize / 3),
      tk.calcRotationalTranslate(120, tileSize / 3),
      tk.calcRotationalTranslate(240, tileSize / 3)
    ], 0);
    this.fill = new Fill("#6262e7", 1);
  }
  collider() {
    return new Collider(player.transform, player.shape);
  }
  render() {
    rt.renderShape(this.transform, this.shape, this.fill, null);
  }
  update() {
    this.shape.r = tk.calcAngle(this.transform, et.dCursor(rt));
  }
}
//general enemy class
class Enemy {
  constructor(transform, shape) {
    this.transform = transform;
    this.shape = shape;
  }
  collider() {
    return new Collider(this.transform, this.shape);
  }
}
class Sphere extends Enemy {
  constructor(transform) {
    super(transform, new Circle(tileSize * 2));
    this.fill = new Fill("#e0a204", 1);
  }
  render() {
    let sinMultiplier = new Pair((Math.sin(ec / 50) / 4) + 1, (Math.sin(ec / 30) / 4) + 1);
    rt.renderCircle(this.transform, new Circle(this.shape.d * (sinMultiplier.x ** 0.3)), new Fill(this.fill.color, 0.5 * sinMultiplier.x), null);
    rt.renderCircle(this.transform, new Circle(this.shape.d * (sinMultiplier.y ** 0.3) * 0.75), new Fill(this.fill.color, 0.5 * sinMultiplier.y), null);
  }
}
class Tile {
  constructor(transform, level) {
    this.transform = transform;
    this.level = level;
  }
}
//wall tile class
class Wall extends Tile {
  constructor(transform, level) {
    super(transform, level);
    this.type = "wall"
    this.fill = new Fill("#171717", 1);
    this.shape = new Rectangle(0, tileSize, tileSize);
  }
  collider() {
    return new Collider(this.transform, this.shape);
  }
  render() {
    rt.renderRectangle(this.transform, this.shape, this.fill, null);
  }
}
//floor tile subclass
class Floor extends Tile {
  constructor(transform, level) {
    super(transform, level);
    this.type = "floor"
    this.fill = new Fill("#343434", 1);
    this.shape = new Rectangle(0, tileSize, tileSize);
  }
  collider() {
    return new Collider(this.transform, this.shape);
  }
  render() {
    rt.renderRectangle(this.transform, this.shape, this.fill, null);
  }
}
//map and level dependents class
class Level {
  constructor() {
    //data initialization
    this.map = [];
    this.items = [];
    this.enemies = [];
    this.playerSpawn = null;
    this.sphere = null;
    //fill map with walls
    for(let i = 0; i < 50; i++) {
      this.map.push([]);
      for(let ii = 0; ii < 50; ii++) {
        this.map[i][ii] = new Wall(new Pair((i - 25) * (tileSize - 1), (ii - 25) * (tileSize - 1)), this);
      }
    }
    //list of validated rooms
    let rooms = [];
    //total attempts
    let spawnAttempts = 0;
    //room creation vars
    let checkIndex = null;
    let dimensions = null;
    let checkFailed = null;
    //room count is variable, but maxes out at 10 + level, has a minimum of 2 rooms, and will halt after 1000 spawn attempts and minimum reached
    while(rooms.length < (10 + levelCount) && (spawnAttempts < 1000 || rooms.length < 2)) {
      //increment spawn attempts
      spawnAttempts++;
      //set room dimensions to odd numbers between 3 and 9
      dimensions = new Pair(1 + (tk.randomNum(1, 4) * 2), 1 + (tk.randomNum(1, 4) * 2));
      //set checkIndex to a tile at a random point within bounds
      checkIndex = new Pair(tk.randomNum(1 + ((dimensions.x + 1) / 2), 48 - ((dimensions.x + 1) / 2)), tk.randomNum(1 + ((dimensions.y + 1) / 2), 48 - ((dimensions.y + 1) / 2)));
      //prepare for check
      checkFailed = false;
      //cycle through x tiles within dimensions + 1 so walls are on outside of room
      for(let i = (dimensions.x + 3 ) / -2; i <= (dimensions.x + 3) / 2; i++) {
        //cycle through y tiles similarly
        for(let ii = (dimensions.y + 3) / -2; ii <= (dimensions.y + 3) / 2; ii++) {
          //if a room is present (floor detected), fail the check and break first loop
          if(this.map[checkIndex.x + i][checkIndex.y + ii].type === "floor") {
            checkFailed = true;
            break;
          }
        }
        //break second loop if failed
        if(checkFailed) {
          break;
        }
      }
      //if check successful
      if(!checkFailed) {
        //add center room index to rooms to carve hallways later
        rooms.push(checkIndex);
        //cycle through tiles again to insert floors
        for(let i = (dimensions.x + 1) / -2; i <= (dimensions.x + 1) / 2; i++) {
          for(let ii = (dimensions.y + 1) / -2; ii <= (dimensions.y + 1) / 2; ii++) {
            this.map[checkIndex.x + i][checkIndex.y + ii] = new Floor(this.map[checkIndex.x + i][checkIndex.y + ii].transform, this);
          }
        }
      }
    }
    //variables to hold most distant
    let mostDistance = 0;
    let mostDistant = new Pair(0, 1);
    //find most distant pair of rooms
    for(let i = 0; i < rooms.length; i++) {
      for(let ii = 0; ii < rooms.length; ii++) {
        let currentDist = tk.calcDistance(this.map[rooms[i].x][rooms[i].y].transform, this.map[rooms[ii].x][rooms[ii].y].transform)
        if(currentDist > mostDistance) {
          mostDistance = currentDist;
          mostDistant.x = i;
          mostDistant.y = ii;
        }
      }
    }
    this.playerSpawn = this.map[rooms[mostDistant.x].x][rooms[mostDistant.x].y].transform;
    this.sphere = new Sphere(this.map[rooms[mostDistant.y].x][rooms[mostDistant.y].y].transform)
    //currentIndex pair to track current map matrix index
    let currentIndex = rooms[0].duplicate();
    //currentTarget pair which tracks the current carve target for first step
    let currentTarget = null;
    //start carving between rooms
    for(let i = 1; i < rooms.length; i++) {
      //set the current target to the end of the first leg
      if(this.map[currentIndex.x, rooms[i].y].type === "floor") {
        currentTarget = new Pair(rooms[i].x, currentIndex.y);
      } else {
        currentTarget = new Pair(currentIndex.x, rooms[i].y);
      }
      //move towards target
      while(currentIndex.x !== currentTarget.x || currentIndex.y !== currentTarget.y) {
        //move on x axis
        if(currentIndex.x < currentTarget.x) {
          currentIndex.x++;
        } else if(currentIndex.x > currentTarget.x) {
          currentIndex.x--;
        }
        //move on y axis
        if(currentIndex.y < currentTarget.y) {
          currentIndex.y++;
        } else if(currentIndex.y > currentTarget.y) {
          currentIndex.y--;
        }
        //insert floors
        if(this.map[currentIndex.x][currentIndex.y].type === "wall") {
          this.map[currentIndex.x][currentIndex.y] = new Floor(this.map[currentIndex.x][currentIndex.y].transform);
        }
      }
      //reset currentTarget to next room
      currentTarget = rooms[i];
      //move towards next room on second leg
      while(currentIndex.x !== currentTarget.x || currentIndex.y !== currentTarget.y) {
        //move on x axis
        if(currentIndex.x < currentTarget.x) {
          currentIndex.x++;
        } else if(currentIndex.x > currentTarget.x) {
          currentIndex.x--;
        }
        //move on y axis
        if(currentIndex.y < currentTarget.y) {
          currentIndex.y++;
        } else if(currentIndex.y > currentTarget.y) {
          currentIndex.y--;
        }
        //insert floors
        if(this.map[currentIndex.x][currentIndex.y].type === "wall") {
          this.map[currentIndex.x][currentIndex.y] = new Floor(this.map[currentIndex.x][currentIndex.y].transform);
        }
      }
    }
  }
  render() {
    for(let i = 0; i < 2500; i++) {
      this.map[Math.floor(i / 50)][i % 50].render();
    }
    for(let i = 0; i < this.enemies.length; i++) {
      this.enemies[i].render();
    }
    this.sphere.render();
  }
}

//FUNCTIONS
//renders everything during game
function renderGame() {
  //canvas clear
  cs.fillAll(new Fill("#000000", 1));
  //render map
  currentLevel.render();
  //render player
  player.render();
}
//updates all updatables during game
function updateGame() {
  //update player
  player.update()
}
//renders and updates button on homescreen
function updateHomescreen() {
  //canvas clear
  cs.fillAll(new Fill("#000000", 1));
  //rendering
  rt.renderCircle(new Pair(cs.w / 2, cs.h / -2), new Circle((cs.w / 2) * (((Math.sin(ec / 50) + 1) / 8) + 1)), new Fill("#e0a204", (Math.sin(ec / 50) + 2) / 4), null);
  rt.renderCircle(new Pair(cs.w / 2, cs.h / -2), new Circle((cs.w / 3) * (((Math.sin(ec / 25) + 1) / 8) + 1)), new Fill("#e0a204", (Math.sin(ec / 25) + 2) / 4), null);
  rt.renderText(new Pair(cs.w / 2, cs.h / -2), new TextNode("Courier New", "Slay the Sphere", 0, cs.w / 40, "center"), new Fill("#EEEEFF", 1));
  rt.renderText(new Pair(cs.w / 2, (cs.h / -2) - cs.w / 40), new TextNode("Courier New", "- click anywhere to begin -", 0, cs.w / 80, "center"), new Fill("#EEEEFF", 1));
  //game start
  if(et.getClick("left")) {
    gameState = "loading";
  }
}
//camera update for player and freecam
function updateCamera() {
  //in freecam mode
  if(freecam) {
    if(et.getKey("a")) {
      rt.camera.x -= 10;
    }
    if(et.getKey("d")) {
      rt.camera.x += 10;
    }
    if(et.getKey("w")) {
      rt.camera.y += 10;
    }
    if(et.getKey("s")) {
      rt.camera.y -= 10;
    }
  //in regular camera mode
  } else {
    rt.camera = new Pair(player.transform.x - (cs.w / 2), player.transform.y + (cs.h / 2))
  }
}
//loads next level
function loadNewLevel() {
  //instantiate and generate new level
  currentLevel = new Level();
  //create new or apply transform to existing player
  if(player === null) {
    player = new Player(currentLevel.playerSpawn)
  } else {
    player.transform = currentLevel.playerSpawn;
  }
  //increment level counter
  levelCount++;
  //start game
  gameState = "inGame";
}