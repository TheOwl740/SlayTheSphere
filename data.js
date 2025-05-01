//ENVIRONMENT INITIALIZATION
//engine tool constants
const cs = new Canvas(document.getElementById("canvas"));
const rt = new RenderTool(cs);
const et = new EventTracker(cs);
const tk = new Toolkit();
let gt;
//canvas dimensions initialization
cs.setDimensions(window.visualViewport?.width || window.innerWidth, window.visualViewport?.height || window.innerHeight);
//browser limiters
et.tabEnabled = false;
et.rightClickEnabled = false;

//GLOBAL VARIABLES
//freecam mode bool
let freecam = true;
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
//pathfinding controller object
let currentPC = null;
//effect controller object
let currentEC = null;
//landscape bool for multiplatform rendering
const landscape = cs.w > cs.h;
//tilesize for rendering tiles
const tileSize = Math.floor(landscape ? cs.w / 25 : cs.h / 15);
//loadstarted tracker assists with loading
let loadStarted = false;

//OBJECTS
//mobile drag controller
const tapData = {
  holdTime: 0,
  dragging: false,
  dragStart: null,
  cameraStart: null,
  realClick: false,
  rct: 0,
  update: () => {
    if(!landscape) {
      if(et.getClick("left")) {
        tapData.realClick = false;
        tapData.rct = 0;
        tapData.holdTime++;
        if(tapData.holdTime > 5) {
          tapData.dragging = true;
          rt.camera = tapData.cameraStart.duplicate().subtract(et.cursor.duplicate().subtract(tapData.dragStart));
        } else if(tapData.holdTime < 2) {
          tapData.dragStart = et.cursor.duplicate();
          tapData.cameraStart = rt.camera.duplicate();
        }
      } else {
        if(tapData.holdTime < 10 && tapData.holdTime > 0 && !tapData.realClick) {
          tapData.realClick = true;
          tapData.rct = 0;
        } else if(tapData.realClick) {
          tapData.rct++;
        }
        if(tapData.rct > 10) {
          tapData.realClick = false;
        }
        tapData.dragStart = null;
        tapData.holdTime = 0;
        tapData.dragging = false;
      }
    }
  },
};
//hud button data
const buttonData = {
  stopWait: {
    transform: () => {return new Pair(cs.w - (cs.h / 32), cs.h / -32)},
    shape: new Rectangle(0, cs.h / 16, cs.h / 16),
    collider: () => {return new Collider(buttonData.stopWait.transform(), buttonData.stopWait.shape)}
  },
  skillTree: {
    transform: () => {return new Pair(cs.w - ((cs.h * 3) / 32), cs.h / -32)},
    shape: new Rectangle(0, cs.h / 16, cs.h / 16),
    collider: () => {return new Collider(buttonData.skillTree.transform(), buttonData.skillTree.shape)}
  },
  exit: {
    transform: () => {return new Pair(cs.w - (cs.h / 32), cs.h / -32)},
    shape: new Rectangle(0, cs.h / 16, cs.h / 16),
    collider: () => {return new Collider(buttonData.exit.transform(), buttonData.exit.shape)}
  },
  upgrade: {
    transforms: {
      speed: () => {return new Pair(cs.w / 8, (cs.h / -2) + (cs.h / 8))},
      attack: () => {return new Pair(cs.w - (cs.w / 8), (cs.h / -2) + (cs.h / 8))},
      health: () => {return new Pair(cs.w / 8, (cs.h / -2) - (cs.h / 8))},
      regen: () => {return new Pair(cs.w - (cs.w / 8), (cs.h / -2) - (cs.h / 8))},
    },
    shape: new Rectangle(0, cs.h / 8, cs.h / 16),
    collider: (transform) => {return new Collider(transform, buttonData.upgrade.shape)}
  }
};
//button count data
const bc = {
  time: 0,
  ready: () => {
    if(bc.time > 0) {
      return false;
    } else {
      bc.time = 50;
      return true;
    }
  },
  update: () => {
    if(bc.time > 0) {
      bc.time--;
    }
  }
};

//CLASSES
//effect control class
class EffectController {
  constructor() {
    this.activeEffects = [];
  }
  add(effect) {
    this.activeEffects.push(effect);
  }
  update() {
    let effect;
    for(let ei = 0; ei < this.activeEffects.length; ei++) {
      effect = this.activeEffects[ei];
      //delete expired effects
      if(effect.remainingDuration <= 0) {
        this.activeEffects.splice(ei, 1);
        ei--;
        continue;
      }
      //increment timer and render
      effect.update();
    }
  }
}
//effect class template
class Effect {
  constructor(duration, transform) {
    this.remainingDuration = duration;
    this.transform = transform.duplicate();
  }
}
//damage number effect subclass
class DamageNumber extends Effect {
  constructor(attackAction) {
    super(60, attackAction.targetEntity.transform);
    this.sourceAttack = attackAction;
  }
  update() {
    this.remainingDuration--;
    if(this.sourceAttack.actor.tile.visible) {
      rt.renderText(this.transform.add(new Pair(Math.sin(ec / 10) * 0.1, 0.1)), new TextNode("Courier New", "-" + this.sourceAttack.damage, 0, (landscape ? cs.w / 50 : cs.h / 35), "center"), new Fill("#561919", this.remainingDuration / 60));
    }
  }
}
//xp gain effect
class XPEffect extends Effect {
  constructor(xpCount) {
    super(60, player.transform);
    this.xpCount = xpCount;
  }
  update() {
    this.remainingDuration--;
    rt.renderText(this.transform.add(new Pair(Math.sin(ec / 10) * 0.1, 0.1)), new TextNode("Courier New", "+" + this.xpCount + "xp", 0, (landscape ? cs.w : cs.h) / 30, "center"), new Fill("#c4b921", this.remainingDuration / 60));
  }
}
//skill point gain effect
class SPEffect extends Effect {
  constructor(pointCount) {
    super(120, player.transform);
    this.pointCount = pointCount;
  }
  update() {
    this.remainingDuration--;
    rt.renderText(this.transform.add(new Pair(Math.sin(ec / 10) * 0.1, 0.1)), new TextNode("Courier New", `+${this.pointCount} Skill Point${this.pointCount > 1 ? "s" : ""}!`, 0, (landscape ? cs.w : cs.h) / 30, "center"), new Fill("#c4b921", this.remainingDuration / 120));
  }
}
//cube death subclass
class CubeDeath extends Effect {
  constructor(cube) {
    super(60, cube.transform);
    this.cube = cube;
  }
  update() {
    this.remainingDuration--;
    if(this.cube.tile.visible) {
      rt.renderRectangle(this.transform, new Rectangle(0, this.cube.shape.w * (this.remainingDuration / 60), this.cube.shape.h * (this.remainingDuration / 60)), new Fill(this.cube.fill.color, this.remainingDuration / 60), null);
    }
  }
}
class NewLevelEffect extends Effect {
  constructor() {
    super(300, new Pair(cs.w / 2, cs.h / -2).add(rt.camera))
  }
  update() {
    this.remainingDuration--;
    if(this.remainingDuration > 150) {
      rt.renderText(this.transform, new TextNode("Courier New", `-Level ${currentLevel.levelCount}-`, 0, (cs.w / 10) * (this.remainingDuration / 150), "center"), new Fill("#FFFFFF", 1));
      rt.renderText(this.transform.duplicate().subtract(new Pair(0, cs.h / 10)), new TextNode("Courier New", "-Slay the Sphere-", 0, (cs.w / 15) * (this.remainingDuration / 150), "center"), new Fill("#FFFFFF", 1));
    } else {
      rt.renderText(this.transform, new TextNode("Courier New", `-Level ${currentLevel.levelCount}-`, 0, cs.w / 10, "center"), new Fill("#FFFFFF", this.remainingDuration / 150));
      rt.renderText(this.transform.duplicate().subtract(new Pair(0, cs.h / 10)), new TextNode("Courier New", "-Slay the Sphere-", 0, (cs.w / 15), "center"), new Fill("#FFFFFF", this.remainingDuration / 150));
    }
  }
}
class WaitEffect extends Effect {
  constructor(waitAction) {
    super(100, waitAction.actor.transform);
    this.actor = waitAction.actor;
  }
  update() {
    this.remainingDuration--;
    if(this.actor.tile.visible) {
      rt.renderText(this.transform.add(new Pair(Math.sin(ec / 10) * 0.1, 0.1)), new TextNode("Courier New", "z", 0, (landscape ? cs.w : cs.h) / 30, "center"), new Fill("#8500d2", this.remainingDuration / 100));
    }
  }
}
//turn controller class
class TurnController {
  constructor() {
    this.turnOrder = [];
    this.currentAction = null;
    this.turn = 0;
    this.highestTurn = 0;
  }
  //adds a new entity to the turn order
  add(entity) {
    this.turnOrder.push(entity)
    this.turnOrder.sort((a, b) => {
      return a.nextTurn - b.nextTurn;
    });
  }
  remove(entity) {
    for(let turnEnt = 0; turnEnt < this.turnOrder.length; turnEnt++) {
      if(entity === this.turnOrder[turnEnt]) {
        this.turnOrder.splice(turnEnt, 1);
        break;
      }
    }
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
    //if no actions to be done
    if(this.currentAction === null) {
      //hold an action object or null placeholder
      let returnAction = this.turnOrder[0].runTurn();
      //if action object is ready
      if(returnAction !== null) {
        //set as current action
        this.currentAction = returnAction;
        //increase next turn of entity by action turn increase
        this.turnOrder[0].nextTurn += returnAction.turnIncrease;
        //set current turn to nextTurn of entity
        this.turn = this.turnOrder[0].nextTurn;
        //check for new highest turn
        if(this.turn > this.highestTurn) {
          //find absolute increase in turns
          let absoluteIncrease = Math.floor(this.turn) - Math.floor(this.highestTurn);
          //for each entity in the turn order
          this.turnOrder.forEach((turnEnt) => {
            //run a number of turn pings
            for(let ping = 0; ping < absoluteIncrease; ping++) {
              turnEnt.turnPing();
            }
          });
          //set highest to new highest
          this.highestTurn = this.turn;
        }
        //re-sort
        this.turnOrder.sort((a, b) => {
          return a.nextTurn - b.nextTurn;
        });
      }
    //if action needs completed
    } else {
      if(this.currentAction.actor.tile.visible) {
        this.currentAction.update();
        this.currentAction.remainingDuration--;
        if(this.currentAction.remainingDuration <= 0) {
          this.currentAction = null;
        }
      } else {
        this.currentAction.complete();
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
    //last frame
    } else {
      if(this.actor.type === "player") {
        currentLevel.reshade();
      }
      this.actor.transform = this.targetTile.transform.duplicate();
    }
  }
  complete() {
    this.actor.tile = this.targetTile;
    this.actor.transform = this.targetTile.transform.duplicate();
    this.actor.shape.r = this.moveDirection;
  }
}
class Melee extends Action {
  constructor(actor, targetEntity) {
    super(actor, actor.melee.time, 15);
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
      currentEC.add(new DamageNumber(this));
    }
    if(this.remainingDuration > 10) {
      this.actor.transform.rotationalIncrease(this.attackDirection, tileSize / 10);
    } else if(this.remainingDuration === 10) {
      this.targetEntity.damage(this);
    } else if(this.remainingDuration > 4) {
      this.actor.transform.rotationalIncrease(this.attackDirection, tileSize / -10);
    }
  }
  complete() {
    this.actor.shape.r = this.attackDirection;
    this.targetEntity.damage(this);
  }
}
class Wait extends Action {
  constructor(actor) {
    super(actor, 1, 15);
    this.type = "wait";
  }
  update() {
    currentEC.add(new WaitEffect(this));
  }
  complete() {
  }
}
//player class
class Player {
  constructor(transform) {
    this.type = "player";
    this.transform = transform;
    this.shape = new Shape([
      tk.calcRotationalTranslate(0, tileSize / 3),
      tk.calcRotationalTranslate(120, tileSize / 3),
      tk.calcRotationalTranslate(240, tileSize / 3)
    ], 0);
    this.fill = new Fill("#6262e7", 1);
    this.tile = currentLevel.getTile(transform);
    this.movePath = null;
    this.targetIndex = null;
    this.nextTurn = 0;
    this.moveTime = 1;
    this.levelCount = 1;
    this.xp = 0;
    this.skillPoints = 0;
    this.melee = {
      time: 1,
      damage: 5,
      getHit: () => {
        return this.melee.damage + tk.randomNum(Math.floor(this.melee.damage / -3), Math.floor(this.melee.damage / 3));
      }
    };
    this.health = {
      current: 20,
      max: 20,
      regenTime: 10,
      regenMax: 10,
      regenPoints: 0
    }
  }
  collider() {
    return new Collider(player.transform, player.shape);
  }
  render() {
    let sinMultiplier = (Math.sin(ec / 50) / 4) + 1;
    rt.renderShape(this.transform, this.shape, this.fill, new Border("#4b4be7", 1, 3 * sinMultiplier, "round"));
  }
  runTurn() {
    //wait action
    if(this.targetIndex === null && ((et.getKey("z") || (tk.detectCollision(et.cursor, buttonData.stopWait.collider()) && (landscape ? et.getClick("left") : tapData.realClick))) && bc.ready())) {
      return new Wait(this);
    }
    //check if at target
    if(this.targetIndex?.isEqualTo(this.tile.index)) {
      this.targetIndex = null;
      this.movePath = null;
    }
    //if there is no target and there is a targeting click
    if(this.targetIndex === null && (landscape ? et.getClick("left") : tapData.realClick)) {
      //get tile at click
      let clickedTile = currentLevel.getTile(et.dCursor(rt));
      //if valid tile
      if(clickedTile?.type === "floor" && clickedTile?.revealed) {
        this.targetIndex = clickedTile.index
      }
    //if there is a target
    } else if(this.targetIndex !== null) {
      //update movepath
      this.updatePath();
      if(this.movePath === null) {
        this.targetIndex = null;
        return null;
      }
      //check against sphere
      if(currentLevel.sphere.tile.index.isEqualTo(this.movePath[0])) {
        this.targetIndex = null;
        return new Melee(this, currentLevel.sphere);
      }
      //check against cubes
      for(let i = 0; i < currentLevel.enemies.length; i++) {
        if(currentLevel.enemies[i].tile.index.isEqualTo(this.movePath[0])) {
          this.targetIndex = null;
          return new Melee(this, currentLevel.enemies[i]);
        }
      }
      //move if no attacks
      return new Movement(this, currentLevel.getIndex(this.movePath[0]));
    }
    return null;
  }
  turnPing() {
    this.health.regenPoints -= this.health.regenPoints > 0 ? 1 : 0;
    this.health.regenTime -= this.health.regenTime > 0 ? 1 : 0;
    if(this.health.regenTime <= 0 && this.health.current < this.health.max && this.health.regenPoints > 0) {
      this.health.current++;
      this.health.regenTime = this.health.regenMax;
    }
  }
  damage(attackAction) {
    this.health.current -= attackAction.damage;
    this.targetIndex = null;
    this.movePath = null;
    if(this.health.current < 1) {
      gameState = "gameOver";
    }
  }
  addXP(count) {
    this.xp += count;
    this.health.regenPoints += count * 3;
    let points = Math.floor(this.xp / (currentLevel.levelCount * 5))
    if(points > 0) {
      currentEC.add(new SPEffect(points));
      this.skillPoints += points;
      this.xp -= points * currentLevel.levelCount * 5;
    } else {
      currentEC.add(new XPEffect(count));
    }
  }
  updatePath() {
    this.movePath = currentPC.pathfind(this.tile.index, this.targetIndex, currentLevel.getNonWalkables(this), 2000);
  }
  updateAux() {
    //cancel move operation
    if(this.targetIndex !== null && ((et.getKey("x") || (tk.detectCollision(et.cursor, buttonData.stopWait.collider()) && (landscape ? et.getClick("left") : tapData.realClick))) && bc.ready())) {
      this.targetIndex = null;
      this.movePath = null;
    }
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
    this.type = "sphere"
    this.fill = new Fill("#e0a204", 1);
    this.health = {
      current: 10 * levelCount,
      max: 10 * levelCount
    }
  }
  render() {
    if(this.tile.visible) {
      let sinMultiplier = new Pair((Math.sin(ec / 50) / 4) + 1, (Math.sin(ec / 30) / 4) + 1);
      rt.renderCircle(this.transform, new Circle(this.shape.d * (sinMultiplier.x ** 0.3)), new Fill(this.fill.color, 0.5 * sinMultiplier.x), null);
      rt.renderCircle(this.transform, new Circle(this.shape.d * (sinMultiplier.y ** 0.3) * 0.75), new Fill(this.fill.color, 0.5 * sinMultiplier.y), null);
      if(this.health.current < this.health.max) {
        renderHealthbar(this, tileSize);
      }
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
    this.type = "cube";
    this.fill = new Fill("#f94f01", 1);
    this.nextTurn = tk.randomNum(0, 1000) / 1000;
    this.moveTime = 1;
    this.state = "sleeping";
    this.targetIndex = null;
    this.path = null;
    this.xpValue = tk.randomNum(3, 6);
    this.melee = {
      time: 1,
      damage: 5,
      getHit: () => {
        return this.melee.damage + tk.randomNum(Math.floor(this.melee.damage / -3), Math.floor(this.melee.damage / 3));
      }
    };
    this.health = {
      current: 10,
      max: 10
    };
  }
  render() {
    if(this.tile.visible) {
      let sinMultiplier = new Pair((Math.sin(ec / 50) / 4) + 1, (Math.sin(ec / 30) / 4) + 1);
      rt.renderRectangle(this.transform, new Rectangle(0, this.shape.w * (sinMultiplier.x ** 0.3), this.shape.h * (sinMultiplier.x ** 0.3)), new Fill(this.fill.color, 0.3 * sinMultiplier.x), null);
      rt.renderRectangle(this.transform, new Rectangle(0, this.shape.w * (sinMultiplier.y ** 0.3) * 0.75, this.shape.h * (sinMultiplier.y ** 0.3) * 0.75), new Fill(this.fill.color, 0.3 * sinMultiplier.y), null);
      if(this.health.current < this.health.max) {
        renderHealthbar(this, tileSize);
      }
    }
  }
  turnPing() {

  }
  runTurn() {
    let octileToPlayer = currentPC.octile(player.tile.index, this.tile.index);
    switch(this.state) {
      case "sleeping":
        //if sleeping, attempt to break out
        if(tk.randomNum(0, octileToPlayer) < 2) {
          this.state = "wandering";
        }
        //send wait
        return new Wait(this);
      case "wandering":
        //open attack if close; will run to next switch
        if(octileToPlayer < 5) {
          this.state = "attacking";
          this.targetIndex = null;
          this.path = null;
        } else {          
          //attempt to choose new location if no target
          if(this.targetIndex === null) {
            let newTarget = currentLevel.getIndex(new Pair(this.tile.index.x + tk.randomNum(-10, 10), this.tile.index.y + tk.randomNum(-10, 10)));
            //if valid target selected, assign
            if(newTarget !== null && newTarget.type === "floor") {
              this.targetIndex = newTarget.index;
            //if no valid target, wait
            } else {
              return new Wait(this);
            }
          } else {
            //if target reached, wait and reset
            if(this.tile.index.isEqualTo(this.targetIndex)) {
              this.targetIndex = null;
              this.path = null;
              return new Wait(this);
            }
            //update pathing before move
            this.updatePath();
            if(this.path === null) {
              this.targetIndex = null;
              return null;
            }         
            //move if target and path valid
            return new Movement(this, currentLevel.getIndex(this.path[0]));
          }
        }
        //return null if state change to attack and as backup
        return null;
      case "attacking":
        //wait and reset if target out of range
        if(currentPC.octile(player.tile.index, this.tile.index) > 9) {
          this.state = "wandering";
          this.targetIndex = null;
          this.path = null;
          return new Wait(this);
        } else {
          //retarget
          this.targetIndex = player.tile.index;
          this.updatePath();
          if(this.path === null) {
            this.targetIndex = null;
            return null;
          }          
          //attack if close
          if(octileToPlayer < 2) {
            return new Melee(this, player);
          //move closer otherwise
          } else {
            return new Movement(this, currentLevel.getIndex(this.path[0]));
          }
        }
    }
    //backup return
    return null;
  }
  damage(attackAction) {
    this.health.current -= attackAction.damage;
  }
  updatePath() {
    this.path = currentPC.pathfind(this.tile.index, this.targetIndex, currentLevel.getNonWalkables(this), 2000);
  }
}
class Tile {
  constructor(transform, index) {
    this.transform = transform;
    this.index = index;
    this.shape = new Rectangle(0, tileSize, tileSize);
    this.revealed = false;
    this.visible = false;
  }
}
//wall tile class
class Wall extends Tile {
  constructor(transform, index) {
    super(transform, index);
    this.type = "wall"
    this.walkable = false;
    this.fill = new Fill("#171717", 1);
    this.border = new Border("#000000", 1, landscape ? 1 : 5, "butt");
  }
  collider() {
    return new Collider(this.transform, this.shape);
  }
  render() {
    if(this.revealed) {
      rt.renderRectangle(this.transform, this.shape, this.fill, this.border);
      if(!this.visible) {
        rt.renderRectangle(this.transform, this.shape, new Fill("#000000", 0.3), null);
      }
    }
  }
}
//floor tile subclass
class Floor extends Tile {
  constructor(transform, index) {
    super(transform, index);
    this.type = "floor"
    this.walkable = true;
    this.fill = new Fill("#343434", 1);
    this.border = new Border("#000000", 1, landscape ? 1 : 5, "butt");
  }
  collider() {
    return new Collider(this.transform, this.shape);
  }
  render() {
    if(this.revealed) {
      rt.renderRectangle(this.transform, this.shape, this.fill, this.border);
      if(!this.visible) {
        rt.renderRectangle(this.transform, this.shape, new Fill("#000000", 0.3), null);
      }
    }
  }
}
//light node for shading
class LightNode {
  constructor(distance, index) {
    this.index = index;
    this.distance = distance;
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
        this.map[i][ii] = new Wall(new Pair((i - 25) * (tileSize - 1), (ii - 25) * (tileSize - 1)), new Pair(i, ii));
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
    while(rooms.length < (2 + this.levelCount) && (spawnAttempts < 1000 || rooms.length < 2)) {
      //increment spawn attempts
      spawnAttempts++;
      //set room dimensions to odd numbers between 3 and 9
      dimensions = new Pair(1 + (tk.randomNum(1, 4) * 2), 1 + (tk.randomNum(1, 4) * 2));
      //set checkIndex to a tile at a random point within bounds
      checkIndex = new Pair(tk.randomNum((this.levelCount < 4 ? 15 : 1) + ((dimensions.x + 1) / 2), (this.levelCount < 4 ? 34 : 48) - ((dimensions.x + 1) / 2)), tk.randomNum((this.levelCount < 4 ? 15 : 1) + ((dimensions.y + 1) / 2), (this.levelCount < 4 ? 34 : 48) - ((dimensions.y + 1) / 2)));
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
          this.map[currentIndex.x][currentIndex.y] = new Floor(this.map[currentIndex.x][currentIndex.y].transform, currentIndex.duplicate());
        }
      }
    }
    //enemy spawning
    while(this.enemies.length < levelCount) {
      let spawnTile = this.map[tk.randomNum(1, 48)][tk.randomNum(1, 48)];
      if(spawnTile.type === "floor" && tk.calcDistance(spawnTile.transform, this.playerSpawn) > tileSize * 5) {
        this.enemies.push(new Cube(spawnTile.transform.duplicate(), spawnTile));
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
    for(let i = 0; i < currentLevel.enemies.length; i++) {
      if(currentLevel.enemies[i].health.current < 1) {
        currentTC.remove(currentLevel.enemies[i]);
        if(currentLevel.enemies[i].type === "cube") {
          currentEC.add(new CubeDeath(currentLevel.enemies[i]));
          player.addXP(currentLevel.enemies[i].xpValue);
        }
        currentLevel.enemies.splice(i, 1);
        i--;
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
    if(index.x > 0 && index.x < 49 && index.y > 0 && index.y < 49) {
      return this.map[index.x][index.y] || null;
    } else {
      return null;
    }
  }
  getNonWalkables(client) {
    const retList = [];
    if(client.type !== "player") {
      retList.push(this.sphere.tile.index.duplicate());
      this.enemies.forEach((enemy) => {
        retList.push(enemy.tile.index.duplicate());
      });
    }
    return retList;
  }
  reshade() {
    //darken all tiles
    for(let ti = 0; ti < 2500; ti++) {
      this.map[Math.floor(ti / 50)][ti % 50].visible = false;
    }
    //key function
    function toKey(index) {
      return index.x + "," + index.y;
    }
    //set of tile indices with finished lighting
    const closed = new Set();
    //array of light nodes ready to be evaluated, initialized at player index
    const open = [new LightNode(0, player.tile.index.duplicate())];
    //current node being evaluated
    let current;
    //loops until all open are closed
    while(open.length > 0) {
      //sort lowest dist first
      open.sort((a, b) => {
        return a.distance - b.distance;
      });
      //set current open
      current = open[0];
      //light tile on map
      this.map[current.index.x][current.index.y].revealed = true;
      this.map[current.index.x][current.index.y].visible = true;
      //close & delete that open
      open.shift();
      closed.add(toKey(current.index))
      //add new opens to list
      for(let x = -1; x <= 1; x++) {
        for(let y = -1; y <= 1; y++) {
          if(!(x === 0 && y === 0)) {
            //setup new index
            let newIndex = current.index.duplicate().add(new Pair(x, y));
            let newDist = current.distance + currentPC.octile(current.index, newIndex);
            //check to see if already opened
            open.forEach((openNode) => {
              if(newIndex !== null && openNode.index.isEqualTo(newIndex)) {
                newIndex = null;
              }
            });
            //if unopened and close enough, add to open
            if(newIndex !== null && newDist < 6 && !closed.has(toKey(newIndex))) {
              let towardPlayerIndex = newIndex.duplicate();
              if(player.tile.index.x !== newIndex.x) {
                towardPlayerIndex.x += player.tile.index.x < newIndex.x ? -1 : 1
              }
              if(player.tile.index.y !== newIndex.y) {
                towardPlayerIndex.y += player.tile.index.y < newIndex.y ? -1 : 1
              }
              if(this.map[newIndex.x][newIndex.y].type === "wall") {
                //unshadow walls
                this.map[newIndex.x][newIndex.y].revealed = true;
                this.map[newIndex.x][newIndex.y].visible = true;
              } else if(this.map[towardPlayerIndex.x][towardPlayerIndex.y].type !== "wall") {
                open.push(new LightNode(newDist, newIndex));
              }
            }
          }
        }
      }
    }
  }
}