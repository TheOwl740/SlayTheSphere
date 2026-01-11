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