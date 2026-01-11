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
      body: images.moles.marshallMole.body.duplicate()
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