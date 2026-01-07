//ENVIRONMENT INITIALIZATION
//engine tool constants
const cs = new Canvas(document.getElementById("canvas"));
const rt = new RenderTool(cs);
const et = new EventTracker(cs);
const tk = new Toolkit();
const hrt = new RenderTool(cs);
const hts = new TileScheme(hrt, new Fill("#5c0051", 1), new Fill("#c23eb2", 1), new Border("#780d6b", 1, 5, "bevel"), new Border("#3f0038", 1, 5, "bevel"), new Fill("#FFFFFF", 1))
let gt;
//canvas initialization
cs.setDimensions(window.visualViewport?.width || window.innerWidth, window.visualViewport?.height || window.innerHeight);
cs.cx.imageSmoothingEnabled = false;
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
const tileSize = Math.floor(landscape ? cs.w / 15 : cs.h / 10);
//tile size rectangle for overlays
const tileShape = new Rectangle(0, tileSize, tileSize);
//loadstarted tracker assists with loading
let loadStarted = false;

//ASSET LOADING
//font
const pixelFont = new FontFace('pixelFont', 'url(Assets/pixelFont.ttf)');
pixelFont.load().then((font) => {
  document.fonts.add(font);
});
//images
const images = {
  marshallMole: {
    body: new Sprite(tk.generateImage("Assets/MarshallMole/body.png"), 1, 0, 0, 0, 200, 200, false, false, 32, 32)
  },
  tilesets: {
    basic: new Sprite(tk.generateImage("Assets/Tilesets/basic.png"), 1, 0, 0, 0, tileSize, tileSize, false, false, 32, 32)
  }
}

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
  },
  tutorial: {
    transform: () => {return new Pair(cs.w / 2, cs.h * -0.75)},
    shape: new Rectangle(0, cs.h / 4, cs.h / 12),
    collider: () => {return new Collider(buttonData.tutorial.transform(), buttonData.tutorial.shape)}
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
      rt.renderText(this.transform.add(new Pair(Math.sin(ec / 10) * 0.1, 0.1)), new TextNode("pixelFont", "-" + this.sourceAttack.damage, 0, (landscape ? cs.w / 50 : cs.h / 35), "center"), new Fill(this.sourceAttack.surprise ? "#ffff00" : "#561919", this.remainingDuration / 60));
    }
  }
}
//xp gain effect
class XPEffect extends Effect {
  constructor(xpCount) {
    super(60, player.transform.duplicate().add(new Pair(0, tileSize)));
    this.xpCount = xpCount;
  }
  update() {
    this.remainingDuration--;
    rt.renderText(this.transform.add(new Pair(Math.sin(ec / 10) * 0.1, 0.1)), new TextNode("pixelFont", "+" + this.xpCount + "xp", 0, (landscape ? cs.w : cs.h) / 30, "center"), new Fill("#c4b921", this.remainingDuration / 60));
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
    rt.renderText(this.transform.add(new Pair(Math.sin(ec / 10) * 0.1, 0.1)), new TextNode("pixelFont", `+${this.pointCount} Skill Point${this.pointCount > 1 ? "s" : ""}!`, 0, (landscape ? cs.w : cs.h) / 30, "center"), new Fill("#c4b921", this.remainingDuration / 120));
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
      if(currentLevel.levelId !== 0) {
        rt.renderText(this.transform, new TextNode("pixelFont", `-Floor ${currentLevel.levelId}-`, 0, (cs.w / 10) * (this.remainingDuration / 150), "center"), new Fill("#FFFFFF", 1));
      }
      rt.renderText(this.transform.duplicate().subtract(new Pair(0, landscape ? cs.w / 10 : cs.h / 10)), new TextNode("pixelFont", currentLevel.zone, 0, (cs.w / 15) * (this.remainingDuration / 150), "center"), new Fill("#FFFFFF", 1));
    } else {
      if(currentLevel.levelId !== 0) {
        rt.renderText(this.transform, new TextNode("pixelFont", `-Level ${currentLevel.levelId}-`, 0, cs.w / 10, "center"), new Fill("#FFFFFF", this.remainingDuration / 150));
      }
      rt.renderText(this.transform.duplicate().subtract(new Pair(0, landscape ? cs.w / 10 : cs.h / 10)), new TextNode("pixelFont", currentLevel.zone, 0, (cs.w / 15), "center"), new Fill("#FFFFFF", this.remainingDuration / 150));
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
      rt.renderText(this.transform.add(new Pair(Math.sin(ec / 10) * 0.1, 0.1)), new TextNode("pixelFont", "z", 0, (landscape ? cs.w : cs.h) / 30, "center"), new Fill("#8500d2", this.remainingDuration / 100));
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
      //update tile relationship
      updateTERelationship(this.actor.tile, this.actor, this.targetTile);
      //face right direction
      if(this.actor.transform.x !== this.targetTile.transform.x) {
        this.actor.leftFacing = this.actor.transform.x > this.targetTile.transform.x;
      }
      //start move animation
      this.actor.animation.state = "move";
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
      //set back to idle
      this.actor.animation.state = "idle";
    }
  }
  complete() {
    //update tile relationship
    updateTERelationship(this.actor.tile, this.actor, this.targetTile);
    this.actor.transform = this.targetTile.transform.duplicate();
  }
}
class Melee extends Action {
  constructor(actor, targetEntity) {
    super(actor, actor.melee.time, 15);
    this.type = "attack";
    this.targetEntity = targetEntity;
    this.damage = actor.melee.getHit();
    this.surprise = false;
    this.attackDirection = tk.calcAngle(this.actor.transform, this.targetEntity.transform);
    if(targetEntity.type !== "player" && !targetEntity.playerLock) {
      this.damage = Math.floor(this.damage * 1.5);
      this.surprise = true;
    }
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
    this.tile;
    this.movePath = null;
    this.targetIndex = null;
    this.nextTurn = 0;
    this.moveTime = 1;
    this.levelId = 1;
    this.xp = 0;
    this.skillPoints = 0;
    this.lastPosition;
    this.forceMove = false;
    this.leftFacing = false;
    this.sprites = {
      body: images.marshallMole.body.duplicate()
    }
    this.animation = {
      state: "idle",
      deltaTime: 0,
      frame: 0
    }
    this.melee = {
      time: 1,
      damage: 7,
      getHit: () => {
        return tk.randomNum(Math.floor(this.melee.damage * 0.6), Math.floor(this.melee.damage * 1.4));
      }
    };
    this.health = {
      current: 20,
      max: 20,
      regenTime: 10,
      regenMax: 10,
      regenPoints: 0
    }
    if(currentLevel !== null) {
      updateTERelationship(null, this, currentLevel.getTile(transform))
    }
  }
  render() {
    //animation frame update
    this.animation.deltaTime += gt.deltaTime;
    if(this.animation.state === "idle") {
      if(this.animation.deltaTime > 0.2) {
        this.animation.deltaTime = 0;
        switch(this.animation.frame) {
          case 0:
            this.animation.frame++;
            this.sprites.body.setActive(new Pair(0, 0))
            break;
          case 1:
            this.animation.frame++;
            this.sprites.body.setActive(new Pair(1, 0))
            break;
          case 2:
            this.animation.frame++;
            this.sprites.body.setActive(new Pair(0, 1))
            break;
          case 3:
            this.animation.frame = 0;
            this.sprites.body.setActive(new Pair(1, 0))
            break;
          default:
            this.animation.frame = 0;
            this.sprites.body.setActive(new Pair(2, 1))
        }
      }
    } else if(this.animation.state === "move") {
      if(this.animation.deltaTime > 0.1) {
        this.animation.deltaTime = 0;
        switch(this.animation.frame) {
          case 0:
            this.animation.frame++;
            this.sprites.body.setActive(new Pair(0, 2))
            break;
          case 1:
            this.animation.frame = 0;
            this.sprites.body.setActive(new Pair(1, 2))
            break;
          default:
            this.animation.frame = 0;
            this.sprites.body.setActive(new Pair(1, 2))
        }
      }
    }
    //update direction
    this.sprites.body.hf = this.leftFacing;
    //image render
    rt.renderImage(this.transform, this.sprites.body);
  }
  runTurn() {
    //set last position
    this.lastPosition = this.tile.index;
    //wait action
    if(this.targetIndex === null && ((et.getKey("z") || (tk.detectCollision(et.cursor, buttonData.stopWait.collider()) && (landscape ? et.getClick("left") : tapData.realClick))) && bc.ready())) {
      return new Wait(this);
    }
    //check if at target
    if(this.targetIndex?.isEqualTo(this.tile.index)) {
      this.targetIndex = null;
      this.movePath = null;
      this.forceMove = false;
    }
    //check for new enemies in sight
    let visibleEnemies = false;
    currentLevel.enemies.forEach((enemy) => {
      if((!raycast(this.tile.index, enemy.tile.index)) && enemy.tile.visible) {
        if(this.movePath !== null && !this.forceMove) {
          this.targetIndex = this.movePath[0];
        }
        visibleEnemies = true;
      }
    });
    //if there is no target and there is a targeting click
    if(this.targetIndex === null && (landscape ? et.getClick("left") : tapData.realClick) && bc.ready()) {
      //get tile at click
      let clickedTile = currentLevel.getTile(et.dCursor(rt));
      //if valid tile
      if(clickedTile?.type !== "wall" && clickedTile?.revealed) {
        this.targetIndex = clickedTile.index;
        this.forceMove = visibleEnemies;
      }
    //if there is a target
    } else if(this.targetIndex !== null) {
      //update movepath
      this.updatePath();
      if(this.movePath === null) {
        this.targetIndex = null;
        this.forceMove = false;
        return null;
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
    this.forceMove = false;
    if(this.health.current < 1) {
      gameState = "gameOver";
    }
  }
  addXP(count) {
    this.xp += count;
    this.health.regenPoints += count * 10;
    let points = Math.floor(this.xp / 20)
    if(points > 0) {
      currentEC.add(new SPEffect(points));
      this.skillPoints += points;
      this.xp -= points * 20;
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
    this.tile;
    updateTERelationship(null, this, tile);
  }
  collider() {
    return new Collider(this.transform, this.shape);
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
    this.chaseTime = 0;
    this.melee = {
      time: 1,
      damage: 3,
      getHit: () => {
        return tk.randomNum(Math.floor(this.melee.damage * 0.6), Math.floor(this.melee.damage * 1.4));
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
    this.playerLock = !raycast(this.tile.index, player.tile.index);
    let heuristicToPlayer = currentPC.heuristic(player.tile.index, this.tile.index);
    switch(this.state) {
      case "sleeping":
        //if sleeping, attempt to break out
        if(tk.randomNum(0, heuristicToPlayer) < 2) {
          this.state = "wandering";
        }
        //send wait
        return new Wait(this);
      case "wandering":
        //open attack if close; will run to next switch
        if(heuristicToPlayer <= currentLevel.visionRange && this.playerLock) {
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
        if(heuristicToPlayer > currentLevel.visionRange || !this.playerLock) {
          this.state = "chasing";
          this.targetIndex = player.lastPosition;
          this.updatePath();
          this.chaseTime = 0;
          return new Wait(this);
        } else {
          //retarget
          this.targetIndex = player.lastPosition;
          this.updatePath();
          if(this.path === null) {
            this.targetIndex = null;
            return null;
          }          
          //attack if close
          if(heuristicToPlayer < 2) {
            return new Melee(this, player);
          //move closer otherwise
          } else {
            return new Movement(this, currentLevel.getIndex(this.path[0]));
          }
        }
      case "chasing":
        if(this.chaseTime > 5) {
          this.state = "wandering";
          this.targetIndex = null;
          this.path = null;
          return new Wait(this);
        } else if(heuristicToPlayer <= currentLevel.visionRange && this.playerLock) {
          this.state = "attacking";
          this.targetIndex = null;
          this.path = null;
          return null;
        } else {
          this.chaseTime++;
          this.targetIndex = player.lastPosition;
          this.updatePath();
          if(this.path === null) {
            this.targetIndex = player.tile.index;
            this.updatePath();
          }
          if(this.path === null) {
            this.targetIndex = null;
            return new Wait(this);
          } 
          return new Movement(this, currentLevel.getIndex(this.path[0]));
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
  constructor(transform, index, sprite) {
    this.transform = transform;
    this.index = index;
    this.sprite = sprite.duplicate();
    this.sprite.r = tk.randomNum(0, 3) * 90;
    this.revealed = false;
    this.visible = false;
  }
  collider() {
    return new Collider(this.transform, tileShape);
  }
}
//wall tile class
class Wall extends Tile {
  constructor(transform, index, sprite) {
    super(transform, index, sprite);
    this.type = "wall"
    this.walkable = false;
    this.sprite.setActive(new Pair(tk.randomNum(0, 1), 2));
  }
  render() {
    if(this.revealed) {
      rt.renderImage(this.transform, this.sprite);
      if(!this.visible) {
        rt.renderRectangle(this.transform, tileShape, new Fill("#000000", 0.3), null);
      }
    }
  }
}
//floor tile subclass
class Floor extends Tile {
  constructor(transform, index, sprite) {
    super(transform, index, sprite);
    this.type = "floor"
    this.walkable = true;
    this.entity = null;
    this.sprite.setActive(new Pair(tk.randomNum(0, 1), tk.randomNum(0, 1)));
  }
  render() {
    if(this.revealed) {
      rt.renderImage(this.transform, this.sprite);
      if(!this.visible) {
        rt.renderRectangle(this.transform, tileShape, new Fill("#000000", 0.3), null);
      }
    }
  }
}
//map and level dependents class
class Level {
  constructor(levelId) {
    //data initialization
    this.type = "level";
    this.map = [];
    this.enemies = [];
    this.npcs = [];
    this.items = [];
    this.playerSpawn = null;
    this.visionRange = 5;
    this.levelId = levelId;
    this.zone = "";

    //assign zone
    if(this.levelId === 0) {
      this.zone = "The Mole Hill"
    } else if(this.levelId >= 4) {
      this.zone = "Buggy Burrows"
    } else if(this.levelId >= 8) {
      this.zone = "The Gnome Home"
    } else if(this.levelId >= 12) {
      this.zone = "Snakey Stronghold"
    } else if(this.levelId >= 16) {
      this.zone = "The Mustelid Mafia"
    }

    //map generation
    //populate map with walls
    for(let i = 0; i < 50; i++) {
      this.map.push([]);
      for(let ii = 0; ii < 50; ii++) {
        this.map[i][ii] = new Wall(new Pair((i - 25) * (tileSize - 1), (ii - 25) * (tileSize - 1)), new Pair(i, ii), images.tilesets.basic);
      }
    }
    //molehill pre fall
    if(levelId === 0) {
      //fill first room
      for(let i = 10; i < 20; i++) {
        for(let ii = 7; ii < 20; ii++) {
          this.map[i][ii] = new Floor(new Pair((i - 25) * (tileSize - 1), (ii - 25) * (tileSize - 1)), new Pair(i, ii), images.tilesets.basic);
        }
      }
      this.playerSpawn = this.getIndex(new Pair(13, 9)).transform.duplicate();
    //buggy burrows
    } else {
      
    }
  }
  render() {
    for(let i = 0; i < 2500; i++) {
      this.map[Math.floor(i / 50)][i % 50].render();
    }
    for(let i = 0; i < this.enemies.length; i++) {
      this.enemies[i].render();
    }
  }
  update() {
    for(let i = 0; i < this.enemies.length; i++) {
      if(this.enemies[i].health.current < 1) {
        currentTC.remove(this.enemies[i]);
        if(this.enemies[i].type === "cube") {
          currentEC.add(new CubeDeath(this.enemies[i]));
          player.addXP(this.enemies[i].xpValue);
        }
        this.enemies[i].tile.entity = null;
        this.enemies.splice(i, 1);
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
    if(index.x >= 0 && index.x < 50 && index.y >= 0 && index.y < 50) {
      return this.map[index.x][index.y] || null;
    } else {
      return null;
    }
  }
  getNonWalkables(client) {
    const retList = [];
    //get friendlies that cant be walked on
    if(client.type !== "player" && client.type !== "level") {
      this.enemies.forEach((enemy) => {
        retList.push(enemy.tile.index.duplicate());
      });
    }
    //get walls
    for(let ct = 0; ct < 2500; ct++) {
      let tObj = this.map[Math.floor(ct / 50)][ct % 50];
      if(tObj.type === "wall") {
        retList.push(tObj.index);
      }
    }
    return retList;
  }
  reshade() {
    //darken all tiles
    for(let ti = 0; ti < 2500; ti++) {
      this.map[Math.floor(ti / 50)][ti % 50].visible = false;
    }
    //set of tile indices with finished lighting
    const closed = new Set();
    //key function
    function toKey(index) {
      return index.x + "," + index.y;
    }
    //circle around player with tile casts
    for(let angle = 0; angle < 360; angle += 5) {
      //mini raycast
      for(let d = 0; d < this.visionRange; d++) {
        let activeTile = rotationalTile(player.tile.index, angle, d);
        if(activeTile === null) {
          break;
        }
        if(activeTile.type === "wall") {
          activeTile.revealed = true;
          activeTile.visible = true;
          break;
        } else {
          if(!closed.has(toKey(activeTile?.index))) {
            activeTile.revealed = true;
            activeTile.visible = true;
            closed.add(toKey(activeTile.index));
          }
        }
      }
    }
  }
}