//ENVIRONMENT INITIALIZATION
//engine tool constants
const cs = new Canvas(document.getElementById("canvas"));
const rt = new RenderTool(cs);
const et = new EventTracker(cs);
const tk = new Toolkit();
//canvas dimensions initialization
cs.setDimensions(window.visualViewport?.width || window.innerWidth, window.visualViewport?.height || window.innerHeight);

//GLOBAL VARIABLES
//freecam mode bool
let freecam = false;
//epoch counter (ticks since game start)
let ec = 0;
//current game state for script handling
let gameState = "homescreen";
//current level object or null when loading
let currentLevel = null;
//player object or null when loading
let player = null;
//turn controller object
let currentTC = null;
//landscape bool for multiplatform rendering
const landscape = cs.w > cs.h;
//tilesize for rendering tiles
const tileSize = Math.floor(landscape ? cs.w / 25 : cs.h / 15);
//blackscreen counter for running blackscreen animation
let cutsceneCount = 0;

//CLASSES
//turn controller class
class TurnController {
  constructor() {
    this.turnOrder = [];
    this.currentAction = null;
  }
  //adds a new entity to the turn order
  add(entity) {
    this.turnOrder.push(entity)
    this.turnOrder.sort((a, b) => {
      return a.nextTurn - b.nextTurn;
    });
  }
  //initialises starting enemies and player on new level
  initialize() {
    player.nextTurn = 0;
    this.turnOrder.push(player);
    currentLevel.enemies.forEach((enemy) => {
      this.turnOrder.push(enemy);
    });
    this.turnOrder.sort((a, b) => {
      return a.nextTurn - b.nextTurn;
    });
  }
  //updates the turn order and runs actions
  update() {
    //freecam control granted if on player turn
    freecam = this.turnOrder[0].type === "player";
    //if no actions to be done
    if(this.currentAction === null) {
      //hold an action object or null placeholder
      let returnAction = this.turnOrder[0].runTurn();
      //if action object is ready
      if(returnAction !== null) {
        //set as current action
        this.currentAction = returnAction;
        //increase next turn of entity by action turn increase
        this.turnOrder[0].nextTurn = returnAction.turnIncrease;
        //re-sort
        this.turnOrder.sort((a, b) => {
          return a.nextTurn - b.nextTurn;
        });
      }
    //if action needs completed
    } else {
      this.currentAction.update();
      this.currentAction.remainingDuration--;
      if(this.currentAction.remainingDuration <= 0) {
        this.currentAction = null;
      }
    }
  }
}
//action class for player and entity actions sent to turn manager
class Action {
  constructor(actor, turnIncrease, duration) {
    this.actor = actor;
    this.turnIncrease = turnIncrease;
    this.duration = duration;
    this.remainingDuration = duration;
  }
}
//move action subclass
class Movement extends Action {
  constructor(actor, targetTile) {
    super(actor, actor.moveTime, 15);
    this.type = "move";
    this.targetTile = targetTile;
    this.stepLength = tk.calcDistance(this.actor.transform, this.targetTile.transform) / this.duration;
    this.moveDirection = tk.calcAngle(this.actor.transform, this.targetTile.transform);
  }
  update() {
    //on start
    if(this.remainingDuration === this.duration) {
      //set active tile
      this.actor.tile = this.targetTile;
      //face right direction
      this.actor.shape.r = this.moveDirection;
    }
    //while running
    if(this.remainingDuration > 1) {
      this.actor.transform.rotationalIncrease(this.moveDirection, this.stepLength);
    } else {
      this.actor.transform = this.targetTile.transform.duplicate();
    }
  }
}
class Melee extends Action {
  constructor(actor, targetEntity) {
    super(actor, actor.attackSpeed, 15);
    this.type = "attack";
    this.targetEntity = targetEntity;
    this.damage = actor.melee.getHit();
    this.attackDirection = tk.calcAngle(this.actor.transform, this.targetEntity.transform);
  }
  update() {
    //on start
    if(this.remainingDuration === this.duration) {
      //face right direction
      this.actor.shape.r = this.attackDirection;
    }
    if(this.remainingDuration > 10) {
      this.actor.transform.rotationalIncrease(this.attackDirection, tileSize / 10);
    } else if(this.remainingDuration === 10) {
      this.targetEntity.damage(this);
    } else if(this.remainingDuration > 4) {
      this.actor.transform.rotationalIncrease(this.attackDirection, tileSize / -10);
    }
  }
}
//player class
class Player {
  constructor(transform, tile) {
    this.type = "player";
    this.transform = transform;
    this.shape = new Shape([
      tk.calcRotationalTranslate(0, tileSize / 3),
      tk.calcRotationalTranslate(120, tileSize / 3),
      tk.calcRotationalTranslate(240, tileSize / 3)
    ], 0);
    this.fill = new Fill("#6262e7", 1);
    this.tile = currentLevel.getTile(transform);
    this.nextTurn = 0;
    this.moveTime = 1;
    this.levelCount = 1;
    this.melee = {
      time: 1,
      damage: 10,
      getHit: () => {
        return this.melee.damage + tk.randomNum(Math.floor(this.melee.damage / -3), Math.floor(this.melee.damage / 3));
      }
    };
    this.health = {
      current: 20,
      max: 20
    }
  }
  collider() {
    return new Collider(player.transform, player.shape);
  }
  render() {
    rt.renderShape(this.transform, this.shape, this.fill, null);
  }
  runTurn() {
    if(et.getClick("left")) {
      //get tile at click
      let tileSelect = currentLevel.getTile(et.dCursor(rt));
      //check against sphere
      if(currentLevel.sphere.tile === tileSelect) {
        return new Melee(this, currentLevel.sphere);
      }
      if(tileSelect?.type === "floor" && tk.calcDistance(this.transform, tileSelect.transform) < tileSize * 1.5 && tk.calcDistance(this.transform, tileSelect.transform) > tileSize / 2) {
        return new Movement(this, tileSelect);
      }
    }
    return null;
  }
  damage(attackAction) {
    this.health.current -= attackAction.damage;
  }
}
//general enemy class
class Enemy {
  constructor(transform, shape, tile) {
    this.transform = transform;
    this.shape = shape;
    this.tile = tile;
  }
  collider() {
    return new Collider(this.transform, this.shape);
  }
}
class Sphere extends Enemy {
  constructor(transform, tile, levelCount) {
    super(transform, new Circle(tileSize * 2), tile);
    this.fill = new Fill("#e0a204", 1);
    this.health = {
      current: 10 * levelCount,
      max: 10
    }
  }
  render() {
    let sinMultiplier = new Pair((Math.sin(ec / 50) / 4) + 1, (Math.sin(ec / 30) / 4) + 1);
    rt.renderCircle(this.transform, new Circle(this.shape.d * (sinMultiplier.x ** 0.3)), new Fill(this.fill.color, 0.5 * sinMultiplier.x), null);
    rt.renderCircle(this.transform, new Circle(this.shape.d * (sinMultiplier.y ** 0.3) * 0.75), new Fill(this.fill.color, 0.5 * sinMultiplier.y), null);
    if(this.health.current < this.health.max) {
      renderHealthbar(this, tileSize);
    }
  }
  damage(attackAction) {
    this.health.current -= attackAction.damage;
    if(this.health.current < 1) {
      gameState = "loading";
    }
  }
}
class Cube extends Enemy {
  constructor(transform, tile) {
    super(transform, new Rectangle(0, tileSize * 0.75, tileSize * 0.75), tile);
    this.fill = new Fill("#f94f01", 1);
    this.nextTurn = 1;
    this.moveTime = 1;
    this.melee = {
      time: 1,
      damage: 5,
    };
    this.health = {
      current: 10,
      max: 10
    }
  }
  render() {
    let sinMultiplier = new Pair((Math.sin(ec / 50) / 4) + 1, (Math.sin(ec / 30) / 4) + 1);
    rt.renderRectangle(this.transform, new Rectangle(0, this.shape.w * (sinMultiplier.x ** 0.3), this.shape.h * (sinMultiplier.x ** 0.3)), new Fill(this.fill.color, 0.5 * sinMultiplier.x), null);
  }
  runTurn() {
    return null;
  }
  damage(attackAction) {
    this.health.current -= attackAction.damage;
  }
}
class Tile {
  constructor(transform, index) {
    this.transform = transform;
    this.index = index;
    this.shape = new Rectangle(0, tileSize, tileSize);
  }
}
//wall tile class
class Wall extends Tile {
  constructor(transform, index) {
    super(transform, index);
    this.type = "wall"
    this.fill = new Fill("#171717", 1);
    this.border = new Border("#000000", 1, landscape ? 1 : 5, "butt");
  }
  collider() {
    return new Collider(this.transform, this.shape);
  }
  render() {
    rt.renderRectangle(this.transform, this.shape, this.fill, this.border);
  }
}
//floor tile subclass
class Floor extends Tile {
  constructor(transform, index) {
    super(transform, index);
    this.type = "floor"
    this.fill = new Fill("#343434", 1);
    this.border = new Border("#000000", 1, landscape ? 1 : 5, "butt");
  }
  collider() {
    return new Collider(this.transform, this.shape);
  }
  render() {
    rt.renderRectangle(this.transform, this.shape, this.fill, this.border);
  }
}
//map and level dependents class
class Level {
  constructor(levelCount) {
    //data initialization
    this.map = [];
    this.items = [];
    this.enemies = [];
    this.playerSpawn = null;
    this.sphere = null;
    this.levelCount = levelCount;
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
    while(rooms.length < (10 + this.levelCount) && (spawnAttempts < 1000 || rooms.length < 2)) {
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
            this.map[checkIndex.x + i][checkIndex.y + ii] = new Floor(this.map[checkIndex.x + i][checkIndex.y + ii].transform, new Pair(checkIndex.x + i, checkIndex.y + ii));
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
    this.playerSpawn = this.map[rooms[mostDistant.x].x][rooms[mostDistant.x].y].transform.duplicate();
    this.sphere = new Sphere(this.map[rooms[mostDistant.y].x][rooms[mostDistant.y].y].transform.duplicate(), this.map[rooms[mostDistant.y].x][rooms[mostDistant.y].y], this.levelCount)
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
          this.map[currentIndex.x][currentIndex.y] = new Floor(this.map[currentIndex.x][currentIndex.y].transform, currentIndex.duplicate());
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
          this.map[currentIndex.x][currentIndex.y] = new Floor(this.map[currentIndex.x][currentIndex.y].transform, currentIndex.duplicate);
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
  update() {
    if(ec % 100 === 0) {
      let spawnAttempt = this.map[tk.randomNum(1, 48)][tk.randomNum(1, 48)];
      if(spawnAttempt.type === "floor" && tk.calcDistance(player.transform, spawnAttempt.transform) > tileSize * 10) {
        this.enemies.push(new Cube(spawnAttempt.transform.duplicate(), spawnAttempt));
      }
    }
  }
  getTile(transform) {
    for(let tile = 0; tile < 2500; tile++) {
      if(tk.detectCollision(transform, this.map[Math.floor(tile / 50)][tile % 50].collider())) {
        return this.map[Math.floor(tile / 50)][tile % 50];
      }
    }
    return null;
  }
  getIndex(index) {
    return this.map[index.x][index.y];
  }
}