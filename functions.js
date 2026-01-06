//FUNCTIONS
//renders everything during game and updates turns and controls
function updateGame() {
  //update turn control
  currentTC.update();
  //update level
  currentLevel.update();
  //canvas clear
  cs.fillAll(new Fill("#000000", 1));
  //render map
  currentLevel.render();
  //render player
  player.render();
  //update player controls
  player.updateAux();
  //update effects
  currentEC.update();
}
//renders and updates button on homescreen
function updateHomescreen() {
  //canvas clear
  cs.fillAll(new Fill("#783b0d", 1));
  //rendering
  rt.renderCircle(new Pair(cs.w / 2, cs.h / -2), new Circle(((landscape ? cs.w : cs.h) / 2) * (((Math.sin(ec / 50) + 1) / 8) + 1)), new Fill("#301f04", (Math.sin(ec / 50) + 2) / 4), null);
  rt.renderCircle(new Pair(cs.w / 2, cs.h / -2), new Circle(((landscape ? cs.w : cs.h) / 3) * (((Math.sin(ec / 25) + 1) / 8) + 1)), new Fill("#301f04", (Math.sin(ec / 25) + 2) / 4), null);
  rt.renderImage(new Pair(cs.w / 2, cs.h / -2), images.marshallMole.body);
  rt.renderText(new Pair(cs.w / 2, cs.h / -3), new TextNode("pixelFont", "MoleHole", 0, landscape ? cs.w / 40 : cs.h / 20, "center"), new Fill("#EEEEFF", 1));
  rt.renderText(new Pair(cs.w / 2, (cs.h / -1.5) - (landscape ? cs.w / 40 : cs.h / 30)), new TextNode("pixelFont", `- ${landscape ? "click" : "tap"} anywhere to begin -`, 0, landscape ? cs.w / 80 : cs.h / 40, "center"), new Fill("#EEEEFF", 1));
  //game start
  if(et.getClick("left") && bc.ready()) {
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
  //in player locked mode
  } else {
    rt.camera = new Pair(player.transform.x - (cs.w / 2), player.transform.y + (cs.h / 2));
  }
}
//loads next level
function loadNewLevel() {
  return new Promise((resolve) => {
    //create new effect controller
    currentEC = new EffectController();
    //create new turn controller
    currentTC = new TurnController();
    //instantiate and generate new level
    currentLevel = new Level(currentLevel?.levelCount + 1 || 1);
    //instantiate pathfinding controller on new level
    currentPC = new PathfindingController(currentLevel.map, true);
    //create new or apply transform to existing player
    if(player === null) {
      player = new Player(currentLevel.playerSpawn.duplicate())
    } else {
      player.transform = currentLevel.playerSpawn.duplicate();
      updateTERelationship(null, player, currentLevel.getTile(currentLevel.playerSpawn));
      player.movePath = null;
    }
    //initialize turn controller data
    currentTC.initialize();
    resolve();
  });
}
//renders healthbar of an object, provided it has a health and transform object attached
function renderHealthbar(targetObj, yOffset) {
  rt.renderRectangle(targetObj.transform.duplicate().add(new Pair(0, yOffset)), new Rectangle(0, tileSize * 0.75, tileSize * 0.2), new Fill("#d60000", 0.5), null);
  rt.renderRectangle(targetObj.transform.duplicate().add(new Pair(0, yOffset)), new Rectangle(0, tileSize * 0.7 * (targetObj.health.current / targetObj.health.max), tileSize * 0.175), new Fill("#16d700", 0.5), null)
}
//updates the loadscreen before next level
function updateLoadscreen() {
  if(loadStarted) {
    rt.camera = new Pair(0, 0);
    cs.fillAll(new Fill("#000000", 1));
    rt.renderText(new Pair(cs.w / 2, (cs.h / -2) + (landscape ? cs.w / 10 : cs.h / 10)), new TextNode("pixelFont", "Loading...", 0, landscape ? cs.w / 40 : cs.h / 20, "center"), new Fill("#FFFFFF", 1));
    rt.renderRectangle(new Pair(cs.w / 2, cs.h / -2), new Rectangle(ec % 360, landscape ? cs.w / 10 : cs.h / 10, landscape ? cs.w / 10 : cs.h / 10), new Fill("#00bbff", 1), new Border("#0091c5", 1, 5, "round"));
    rt.renderRectangle(new Pair(cs.w / 2, cs.h / -2), new Rectangle((ec % 360) * -1, landscape ? cs.w / 20 : cs.h / 20, landscape ? cs.w / 20 : cs.h / 20), new Fill("#00bbff", 1), new Border("#0091c5", 1, 5, "round"));
  } else {
    loadStarted = true;
    loadNewLevel().then(() => {
      //lock camera to player
      rt.camera = new Pair(player.transform.x - (cs.w / 2), player.transform.y + (cs.h / 2));
      //shade first area
      currentLevel.reshade();
      //add levelEffect
      currentEC.add(new NewLevelEffect());
      //start game
      gameState = "inGame";
      loadStarted = false;
    });
  }
}
//renders hud overlay
function updateHUD() {
  //health bar
  rt.renderRectangle(new Pair(cs.w / 8, cs.h / -32).add(rt.camera), new Rectangle(0, cs.w / 4, cs.h / 16), new Fill("#d60000", 0.5), null);
  rt.renderRectangle(new Pair((cs.w / 8) * (player.health.current / player.health.max), cs.h / -32).add(rt.camera), new Rectangle(0, (cs.w / 4) * (player.health.current / player.health.max), cs.h / 16), new Fill("#16d700", 0.8), null);
  rt.renderText(new Pair(cs.w / 8, cs.h / -32).add(rt.camera), new TextNode("pixelFont", `HP: ${player.health.current}/${player.health.max}`, 0, cs.w / 30, "center"), new Fill("#FFFFFF", 1));
  //xp bar
  rt.renderRectangle(new Pair((cs.w / 4) + (cs.w / 8), cs.h / -32).add(rt.camera), new Rectangle(0, cs.w / 4, cs.h / 16), new Fill("#82846e", 0.5), null);
  rt.renderRectangle(new Pair((cs.w / 4) + ((cs.w / 8) * (player.xp / 20)), cs.h / -32).add(rt.camera), new Rectangle(0, (cs.w / 4) * (player.xp / 20), cs.h / 16), new Fill("#c4b921", 0.8), null);
  rt.renderText(new Pair((cs.w / 4) + (cs.w / 8), cs.h / -32).add(rt.camera), new TextNode("pixelFont", `XP: ${player.xp}/20`, 0, cs.w / 30, "center"), new Fill("#FFFFFF", 1));
  //wait/cancel button
  rt.renderRectangle(buttonData.stopWait.transform().add(rt.camera), buttonData.stopWait.shape, new Fill("#82846e", 0.5), null);
  if(player.targetIndex === null) {
    rt.renderText(buttonData.stopWait.transform().add(rt.camera), new TextNode("pixelFont", "z", 0, (landscape ? cs.w : cs.h) / 30, "center"), new Fill("#8500d2", 1));
  } else {
    rt.renderText(buttonData.stopWait.transform().add(rt.camera), new TextNode("pixelFont", "x", 0, (landscape ? cs.w : cs.h) / 30, "center"), new Fill("#d21c1c", 1));
  }
  //skill tree button
  rt.renderRectangle(buttonData.skillTree.transform().add(rt.camera), buttonData.skillTree.shape, new Fill("#82846e", 0.5), null);
  rt.renderText(buttonData.skillTree.transform().add(rt.camera), new TextNode("pixelFont", "+", 0, (landscape ? cs.w : cs.h) / 30, "center"), new Fill("#c4b921", 1));
  //skill tree access
  if((et.getKey("q") || (tk.detectCollision(et.cursor, buttonData.skillTree.collider()) && (landscape ? et.getClick("left") : tapData.realClick))) && bc.ready()) {
    gameState = "skillTree";
  }
}
//renders fail screen
function updateFailscreen() {
  //reset
  player = null;
  currentLevel = null;
  currentEC = null;
  currentTC = null;
  currentPC = null;
  rt.camera = new Pair(0, 0);
  //canvas clear
  cs.fillAll(new Fill("#000000", 1));
  //rendering
  rt.renderCircle(new Pair(cs.w / 2, cs.h / -2), new Circle(((landscape ? cs.w : cs.h) / 3) * (((Math.sin(ec / 50) + 1) / 8) + 1)), new Fill("#d13c3c", (Math.sin(ec / 50) + 2) / 4), null);
  rt.renderCircle(new Pair(cs.w / 2, cs.h / -2), new Circle(((landscape ? cs.w : cs.h) / 4) * (((Math.sin(ec / 25) + 1) / 8) + 1)), new Fill("#d13c3c", (Math.sin(ec / 25) + 2) / 4), null);
  rt.renderText(new Pair(cs.w / 2, cs.h / -2), new TextNode("pixelFont", "Game Over", 0, landscape ? cs.w / 40 : cs.h / 20, "center"), new Fill("#EEEEFF", 1));
  rt.renderText(new Pair(cs.w / 2, (cs.h / -2) - (landscape ? cs.w / 40 : cs.h / 30)), new TextNode("pixelFont", `- ${landscape ? "click" : "tap"} anywhere for main menu -`, 0, landscape ? cs.w / 80 : cs.h / 40, "center"), new Fill("#EEEEFF", 1));
  //game start
  if(et.getClick("left") && bc.ready()) {
    gameState = "homescreen";
  }
}
function updateSkillTree() {
  //clear canvas
  cs.fillAll(new Fill("#000000", 1))
  //exit button render
  rt.renderRectangle(buttonData.exit.transform().add(rt.camera), buttonData.exit.shape, new Fill("#82846e", 0.5), null);
  rt.renderText(buttonData.exit.transform().add(rt.camera), new TextNode("pixelFont", "x", 0, (landscape ? cs.w : cs.h) / 30, "center"), new Fill("#d13c3c", 1));
  //exit button function
  if((et.getKey("x") || (tk.detectCollision(et.cursor, buttonData.exit.collider()) && (landscape ? et.getClick("left") : tapData.realClick))) && bc.ready()) {
    gameState = "inGame";
  }
  //main text and points
  rt.renderText(new Pair(cs.w / 2, cs.h / -2).add(rt.camera), new TextNode("pixelFont", `Upgrades: ${player.skillPoints}pts`, 0, (landscape ? cs.w : cs.h) / 30, "center"), new Fill("#ffffff", 1));
  //speed upgrade render
  rt.renderRectangle(buttonData.upgrade.transforms.speed().add(rt.camera), buttonData.upgrade.shape, new Fill("#6f6f6f", 1), null);
  rt.renderText(buttonData.upgrade.transforms.speed().add(rt.camera), new TextNode("pixelFont", "speed", 0, (landscape ? cs.w / 65 : cs.h / 35), "center"), new Fill("#fff200", 1));
  //button function
  if((tk.detectCollision(et.cursor, buttonData.upgrade.collider(buttonData.upgrade.transforms.speed())) && (landscape ? et.getClick("left") : tapData.realClick)) && bc.ready()) {
    if(player.skillPoints > 0) {
      player.skillPoints--;
      player.moveTime = Math.floor(player.moveTime * 900) / 1000;
    }
  }
  //attack upgrade
  rt.renderRectangle(buttonData.upgrade.transforms.attack().add(rt.camera), buttonData.upgrade.shape, new Fill("#6f6f6f", 1), null);
  rt.renderText(buttonData.upgrade.transforms.attack().add(rt.camera), new TextNode("pixelFont", "attack", 0, (landscape ? cs.w / 65 : cs.h / 35), "center"), new Fill("#d13c3c", 1));
  //button function
  if((tk.detectCollision(et.cursor, buttonData.upgrade.collider(buttonData.upgrade.transforms.attack())) && (landscape ? et.getClick("left") : tapData.realClick)) && bc.ready()) {
    if(player.skillPoints > 0) {
      player.skillPoints--;
      player.melee.damage++;
    }
  }
  //health upgrade
  rt.renderRectangle(buttonData.upgrade.transforms.health().add(rt.camera), buttonData.upgrade.shape, new Fill("#6f6f6f", 1), null);
  rt.renderText(buttonData.upgrade.transforms.health().add(rt.camera), new TextNode("pixelFont", "health", 0, (landscape ? cs.w / 65 : cs.h / 35), "center"), new Fill("#6aff00", 1));
  //button function
  if((tk.detectCollision(et.cursor, buttonData.upgrade.collider(buttonData.upgrade.transforms.health())) && (landscape ? et.getClick("left") : tapData.realClick)) && bc.ready()) {
    if(player.skillPoints > 0) {
      player.skillPoints--;
      player.health.max += 5;
      player.health.current += 5;
    }
  }
  //regen upgrade
  rt.renderRectangle(buttonData.upgrade.transforms.regen().add(rt.camera), buttonData.upgrade.shape, new Fill("#6f6f6f", 1), null);
  rt.renderText(buttonData.upgrade.transforms.regen().add(rt.camera), new TextNode("pixelFont", "regen", 0, (landscape ? cs.w / 65 : cs.h / 35), "center"), new Fill("#ff00d9", 1));
  //button function
  if((tk.detectCollision(et.cursor, buttonData.upgrade.collider(buttonData.upgrade.transforms.regen())) && (landscape ? et.getClick("left") : tapData.realClick)) && bc.ready()) {
    if(player.skillPoints > 0) {
      player.skillPoints--;
      player.health.regenMax = Math.floor(player.health.regenMax * 900) / 1000;
    }
  }
}
//updates the relationship between entity and tile
function updateTERelationship(oldTile, entity, newTile) {
  if(oldTile) {
    oldTile.entity = null;
  }
  entity.tile = newTile;
  newTile.entity = entity;
}
//rotational translate for whole indices
function rotationalTile(index, angle, magnitude) {
  return currentLevel.getIndex((index.duplicate().add(tk.calcRotationalTranslate(angle, magnitude))).round(0));
}
//tile based raycast, blocked by nonwalkables.. 
function raycast(originIndex, targetIndex) {
  let angle = tk.calcAngle(originIndex, targetIndex);
  for(let seg = 0; seg < Math.round(currentPC.heuristic(originIndex, targetIndex)); seg++) {
    let activeTile = rotationalTile(originIndex, angle, seg);
    if(activeTile.type === "wall" || (activeTile.type === "door" && activeTile.entity === null)) {
      return activeTile;
    }
  }
  return false;
}