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
  cs.fillAll(new Fill("#000000", 1));
  //rendering
  rt.renderCircle(new Pair(cs.w / 2, cs.h / -2), new Circle(((landscape ? cs.w : cs.h) / 2) * (((Math.sin(ec / 50) + 1) / 8) + 1)), new Fill("#e0a204", (Math.sin(ec / 50) + 2) / 4), null);
  rt.renderCircle(new Pair(cs.w / 2, cs.h / -2), new Circle(((landscape ? cs.w : cs.h) / 3) * (((Math.sin(ec / 25) + 1) / 8) + 1)), new Fill("#e0a204", (Math.sin(ec / 25) + 2) / 4), null);
  rt.renderText(new Pair(cs.w / 2, cs.h / -2), new TextNode("Courier New", "Slay the Sphere", 0, landscape ? cs.w / 40 : cs.h / 20, "center"), new Fill("#EEEEFF", 1));
  rt.renderText(new Pair(cs.w / 2, (cs.h / -2) - (landscape ? cs.w / 40 : cs.h / 30)), new TextNode("Courier New", `- ${landscape ? "click" : "tap"} anywhere to begin -`, 0, landscape ? cs.w / 80 : cs.h / 40, "center"), new Fill("#EEEEFF", 1));
  //tutorial button render
  rt.renderRectangle(buttonData.tutorial.transform(), buttonData.tutorial.shape, new Fill("#6a6a6a", 1), null);
  rt.renderText(buttonData.tutorial.transform(), new TextNode("Courier New", "How to play", 0, landscape ? cs.w / 80 : cs.h / 40, "center"), new Fill("#EEEEFF", 1));
  //tutorial open
  if(et.getClick("left") && tk.detectCollision(et.cursor, buttonData.tutorial.collider()) && bc.ready()) {
    gameState = "tutorial";
  //game start
  } else if(et.getClick("left") && bc.ready()) {
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
    currentPC = new PathfindingController(currentLevel.map);
    //create new or apply transform to existing player
    if(player === null) {
      player = new Player(currentLevel.playerSpawn)
    } else {
      player.transform = currentLevel.playerSpawn;
      updateTERelationship(null, player, currentLevel.getTile(currentLevel.playerSpawn));
      player.movePath = null;
    }
    //initialize turn controller data
    currentTC.initialize();
    window.setTimeout(resolve, 1000);
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
    rt.renderText(new Pair(cs.w / 2, (cs.h / -2) + (landscape ? cs.w / 10 : cs.h / 10)), new TextNode("Courier New", "Loading...", 0, landscape ? cs.w / 40 : cs.h / 20, "center"), new Fill("#FFFFFF", 1));
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
  rt.renderText(new Pair(cs.w / 8, cs.h / -32).add(rt.camera), new TextNode("Courier New", `HP: ${player.health.current}/${player.health.max}`, 0, cs.w / 30, "center"), new Fill("#FFFFFF", 1));
  //xp bar
  rt.renderRectangle(new Pair((cs.w / 4) + (cs.w / 8), cs.h / -32).add(rt.camera), new Rectangle(0, cs.w / 4, cs.h / 16), new Fill("#82846e", 0.5), null);
  rt.renderRectangle(new Pair((cs.w / 4) + ((cs.w / 8) * (player.xp / 20)), cs.h / -32).add(rt.camera), new Rectangle(0, (cs.w / 4) * (player.xp / 20), cs.h / 16), new Fill("#c4b921", 0.8), null);
  rt.renderText(new Pair((cs.w / 4) + (cs.w / 8), cs.h / -32).add(rt.camera), new TextNode("Courier New", `XP: ${player.xp}/20`, 0, cs.w / 30, "center"), new Fill("#FFFFFF", 1));
  //wait/cancel button
  rt.renderRectangle(buttonData.stopWait.transform().add(rt.camera), buttonData.stopWait.shape, new Fill("#82846e", 0.5), null);
  if(player.targetIndex === null) {
    rt.renderText(buttonData.stopWait.transform().add(rt.camera), new TextNode("Courier New", "z", 0, (landscape ? cs.w : cs.h) / 30, "center"), new Fill("#8500d2", 1));
  } else {
    rt.renderText(buttonData.stopWait.transform().add(rt.camera), new TextNode("Courier New", "x", 0, (landscape ? cs.w : cs.h) / 30, "center"), new Fill("#d21c1c", 1));
  }
  //skill tree button
  rt.renderRectangle(buttonData.skillTree.transform().add(rt.camera), buttonData.skillTree.shape, new Fill("#82846e", 0.5), null);
  rt.renderText(buttonData.skillTree.transform().add(rt.camera), new TextNode("Courier New", "+", 0, (landscape ? cs.w : cs.h) / 30, "center"), new Fill("#c4b921", 1));
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
  rt.renderText(new Pair(cs.w / 2, cs.h / -2), new TextNode("Courier New", "Game Over", 0, landscape ? cs.w / 40 : cs.h / 20, "center"), new Fill("#EEEEFF", 1));
  rt.renderText(new Pair(cs.w / 2, (cs.h / -2) - (landscape ? cs.w / 40 : cs.h / 30)), new TextNode("Courier New", `- ${landscape ? "click" : "tap"} anywhere for main menu -`, 0, landscape ? cs.w / 80 : cs.h / 40, "center"), new Fill("#EEEEFF", 1));
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
  rt.renderText(buttonData.exit.transform().add(rt.camera), new TextNode("Courier New", "x", 0, (landscape ? cs.w : cs.h) / 30, "center"), new Fill("#d13c3c", 1));
  //exit button function
  if((et.getKey("x") || (tk.detectCollision(et.cursor, buttonData.exit.collider()) && (landscape ? et.getClick("left") : tapData.realClick))) && bc.ready()) {
    gameState = "inGame";
  }
  //main text and points
  rt.renderText(new Pair(cs.w / 2, cs.h / -2).add(rt.camera), new TextNode("Courier New", `Upgrades: ${player.skillPoints}pts`, 0, (landscape ? cs.w : cs.h) / 30, "center"), new Fill("#ffffff", 1));
  //speed upgrade render
  rt.renderRectangle(buttonData.upgrade.transforms.speed().add(rt.camera), buttonData.upgrade.shape, new Fill("#6f6f6f", 1), null);
  rt.renderText(buttonData.upgrade.transforms.speed().add(rt.camera), new TextNode("Courier New", "speed", 0, (landscape ? cs.w / 65 : cs.h / 35), "center"), new Fill("#fff200", 1));
  //button function
  if((tk.detectCollision(et.cursor, buttonData.upgrade.collider(buttonData.upgrade.transforms.speed())) && (landscape ? et.getClick("left") : tapData.realClick)) && bc.ready()) {
    if(player.skillPoints > 0) {
      player.skillPoints--;
      player.moveTime = Math.floor(player.moveTime * 900) / 1000;
    }
  }
  //attack upgrade
  rt.renderRectangle(buttonData.upgrade.transforms.attack().add(rt.camera), buttonData.upgrade.shape, new Fill("#6f6f6f", 1), null);
  rt.renderText(buttonData.upgrade.transforms.attack().add(rt.camera), new TextNode("Courier New", "attack", 0, (landscape ? cs.w / 65 : cs.h / 35), "center"), new Fill("#d13c3c", 1));
  //button function
  if((tk.detectCollision(et.cursor, buttonData.upgrade.collider(buttonData.upgrade.transforms.attack())) && (landscape ? et.getClick("left") : tapData.realClick)) && bc.ready()) {
    if(player.skillPoints > 0) {
      player.skillPoints--;
      player.melee.damage++;
    }
  }
  //health upgrade
  rt.renderRectangle(buttonData.upgrade.transforms.health().add(rt.camera), buttonData.upgrade.shape, new Fill("#6f6f6f", 1), null);
  rt.renderText(buttonData.upgrade.transforms.health().add(rt.camera), new TextNode("Courier New", "health", 0, (landscape ? cs.w / 65 : cs.h / 35), "center"), new Fill("#6aff00", 1));
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
  rt.renderText(buttonData.upgrade.transforms.regen().add(rt.camera), new TextNode("Courier New", "regen", 0, (landscape ? cs.w / 65 : cs.h / 35), "center"), new Fill("#ff00d9", 1));
  //button function
  if((tk.detectCollision(et.cursor, buttonData.upgrade.collider(buttonData.upgrade.transforms.regen())) && (landscape ? et.getClick("left") : tapData.realClick)) && bc.ready()) {
    if(player.skillPoints > 0) {
      player.skillPoints--;
      player.health.regenMax = Math.floor(player.health.regenMax * 900) / 1000;
    }
  }
}
//renders and updates tutorial page
function updateTutorial() {
  //canvas clear
  cs.fillAll(new Fill("#000000", 1));
  //background circle
  rt.renderCircle(new Pair(cs.w / 2, cs.h / -2), new Circle(((landscape ? cs.w : cs.h) / 2) * (((Math.sin(ec / 50) + 1) / 8) + 1)), new Fill("#0a6f22", (Math.sin(ec / 50) + 2) / 4), null);
  rt.renderCircle(new Pair(cs.w / 2, cs.h / -2), new Circle(((landscape ? cs.w : cs.h) / 3) * (((Math.sin(ec / 25) + 1) / 8) + 1)), new Fill("#0a6f22", (Math.sin(ec / 25) + 2) / 4), null);
  //text rendering
  rt.renderText(new Pair(cs.w / 2, cs.h / -15), new TextNode("Courier New", "How To Play", 0, landscape ? cs.w / 40 : cs.h / 20, "center"), new Fill("#EEEEFF", 1));
  rt.renderText(new Pair(cs.w * 0.05, (cs.h / -10) - ((landscape ? cs.w / 40 : cs.h / 30) * 1)), new TextNode("Courier New", "Slay The Sphere is a turn based dungeon crawler", 0, landscape ? cs.w / 50 : cs.h / 75, "left"), new Fill("#EEEEFF", 1));
  rt.renderText(new Pair(cs.w * 0.05, (cs.h / -10) - ((landscape ? cs.w / 40 : cs.h / 30) * 2)), new TextNode("Courier New", "The objective is to destroy each floor's sphere", 0, landscape ? cs.w / 50 : cs.h / 75, "left"), new Fill("#EEEEFF", 1));
  rt.renderText(new Pair(cs.w * 0.05, (cs.h / -10) - ((landscape ? cs.w / 40 : cs.h / 30) * 3)), new TextNode("Courier New", "Move by clicking floor tiles, (light colored)", 0, landscape ? cs.w / 50 : cs.h / 75, "left"), new Fill("#EEEEFF", 1));
  rt.renderText(new Pair(cs.w * 0.05, (cs.h / -10) - ((landscape ? cs.w / 40 : cs.h / 30) * 4)), new TextNode("Courier New", "You will encounter enemies (red cubes and more)", 0, landscape ? cs.w / 50 : cs.h / 75, "left"), new Fill("#EEEEFF", 1));
  rt.renderText(new Pair(cs.w * 0.05, (cs.h / -10) - ((landscape ? cs.w / 40 : cs.h / 30) * 5)), new TextNode("Courier New", "Click them to attack. They will emit damage numbers", 0, landscape ? cs.w / 50 : cs.h / 75, "left"), new Fill("#EEEEFF", 1));
  rt.renderText(new Pair(cs.w * 0.05, (cs.h / -10) - ((landscape ? cs.w / 40 : cs.h / 30) * 6)), new TextNode("Courier New", "Watch your healthbar (top left)- no respawns", 0, landscape ? cs.w / 50 : cs.h / 75, "left"), new Fill("#EEEEFF", 1));
  rt.renderText(new Pair(cs.w * 0.05, (cs.h / -10) - ((landscape ? cs.w / 40 : cs.h / 30) * 7)), new TextNode("Courier New", "Killing enemies awards xp- 20 xp for a skill point", 0, landscape ? cs.w / 50 : cs.h / 75, "left"), new Fill("#EEEEFF", 1));
  rt.renderText(new Pair(cs.w * 0.05, (cs.h / -10) - ((landscape ? cs.w / 40 : cs.h / 30) * 8)), new TextNode("Courier New", "Destroy the sphere to advance to next level", 0, landscape ? cs.w / 50 : cs.h / 75, "left"), new Fill("#EEEEFF", 1));
  rt.renderText(new Pair(cs.w * 0.05, (cs.h / -10) - ((landscape ? cs.w / 40 : cs.h / 30) * 9)), new TextNode("Courier New", "The dungeon's dark- shaded tiles are out of view", 0, landscape ? cs.w / 50 : cs.h / 75, "left"), new Fill("#EEEEFF", 1));
  rt.renderText(new Pair(cs.w * 0.05, (cs.h / -10) - ((landscape ? cs.w / 40 : cs.h / 30) * 10)), new TextNode("Courier New", "Even explored tiles can hide enemies if out of view", 0, landscape ? cs.w / 50 : cs.h / 75, "left"), new Fill("#EEEEFF", 1));
  rt.renderText(new Pair(cs.w * 0.05, (cs.h / -10) - ((landscape ? cs.w / 40 : cs.h / 30) * 11)), new TextNode("Courier New", "Need to wait a turn? Perform a wait action (z button)", 0, landscape ? cs.w / 50 : cs.h / 75, "left"), new Fill("#EEEEFF", 1));
  rt.renderText(new Pair(cs.w * 0.05, (cs.h / -10) - ((landscape ? cs.w / 40 : cs.h / 30) * 12)), new TextNode("Courier New", "Regen requires recently gained xp- can't run forever", 0, landscape ? cs.w / 50 : cs.h / 75, "left"), new Fill("#EEEEFF", 1));
  rt.renderText(new Pair(cs.w * 0.05, (cs.h / -10) - ((landscape ? cs.w / 40 : cs.h / 30) * 13)), new TextNode("Courier New", "Wrap enemies around corners to surprise attack", 0, landscape ? cs.w / 50 : cs.h / 75, "left"), new Fill("#EEEEFF", 1));
  //exit button render
  rt.renderRectangle(buttonData.exit.transform().add(rt.camera), buttonData.exit.shape, new Fill("#82846e", 0.5), null);
  rt.renderText(buttonData.exit.transform().add(rt.camera), new TextNode("Courier New", "x", 0, (landscape ? cs.w : cs.h) / 30, "center"), new Fill("#d13c3c", 1));
  //exit button function
  if((et.getKey("x") || (tk.detectCollision(et.cursor, buttonData.exit.collider()) && (landscape ? et.getClick("left") : tapData.realClick))) && bc.ready()) {
    gameState = "homescreen";
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
  return currentLevel.getIndex((index.duplicate().add(tk.calcRotationalTranslate(angle, magnitude))).round(0))
}
//tile based raycast, blocked by nonwalkables
function raycast(originIndex, targetIndex) {
  let angle = tk.calcAngle(originIndex, targetIndex)
  for(let seg = 0; seg < Math.round(currentPC.octile(originIndex, targetIndex)); seg++) {
    if(rotationalTile(originIndex, angle, seg)?.type === "wall") {
      return rotationalTile(originIndex, angle, seg);
    }
  }
  return false;
}