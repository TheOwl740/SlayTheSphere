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
  //update effects
  currentEC.update();
  //update tap controller
  if(!landscape) {
    tapData.update();
  }
}
//renders and updates button on homescreen
function updateHomescreen() {
  //canvas clear
  cs.fillAll(new Fill("#000000", 1));
  //rendering
  rt.renderCircle(new Pair(cs.w / 2, cs.h / -2), new Circle(((landscape ? cs.w : cs.h) / 2) * (((Math.sin(ec / 50) + 1) / 8) + 1)), new Fill("#e0a204", (Math.sin(ec / 50) + 2) / 4), null);
  rt.renderCircle(new Pair(cs.w / 2, cs.h / -2), new Circle(((landscape ? cs.w : cs.h) / 3) * (((Math.sin(ec / 25) + 1) / 8) + 1)), new Fill("#e0a204", (Math.sin(ec / 25) + 2) / 4), null);
  rt.renderText(new Pair(cs.w / 2, cs.h / -2), new TextNode("Courier New", "Slay the Sphere", 0, landscape ? cs.w / 40 : cs.h / 20, "center"), new Fill("#EEEEFF", 1));
  rt.renderText(new Pair(cs.w / 2, (cs.h / -2) - (landscape ? cs.w / 40 : cs.h / 30)), new TextNode("Courier New", "- click anywhere to begin -", 0, landscape ? cs.w / 80 : cs.h / 40, "center"), new Fill("#EEEEFF", 1));
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
      player.tile = currentLevel.getTile(player.transform);
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
      //start game
      gameState = "inGame";
      loadStarted = false;
    });
  }
}
//renders hud overlay
function renderHUD() {
  rt.renderRectangle(new Pair(cs.w / 8, -cs.h + (cs.h / 32)).add(rt.camera), new Rectangle(0, cs.w / 4, cs.h / 16), new Fill("#d60000", 0.5), null);
  rt.renderRectangle(new Pair((cs.w / 8) * (player.health.current / player.health.max), -cs.h + (cs.h / 32)).add(rt.camera), new Rectangle(0, (cs.w / 4) * (player.health.current / player.health.max), cs.h / 16), new Fill("#16d700", 0.5), null);
  rt.renderText(new Pair(cs.w / 8, -cs.h + (cs.h / 32)).add(rt.camera), new TextNode("Courier New", `HP: ${player.health.current}/${player.health.max}`, 0, cs.w / 30, "center"), new Fill("#FFFFFF", 1));
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
  rt.renderText(new Pair(cs.w / 2, (cs.h / -2) - (landscape ? cs.w / 40 : cs.h / 30)), new TextNode("Courier New", "- click anywhere for main menu -", 0, landscape ? cs.w / 80 : cs.h / 40, "center"), new Fill("#EEEEFF", 1));
  //game start
  if(et.getClick("left")) {
    window.setTimeout(() => {gameState = "homescreen"}, 100);
  }
}
//debug tools
function updateDebugger() {
  if(debug) {
    //render move path
    if(player.movePath !== null) {
      for(i = 0; i < player.movePath.length; i++) {
        rt.renderRectangle(currentLevel.getIndex(player.movePath[i]).transform, new Rectangle(0, tileSize / 3, tileSize / 3), new Fill("#FFFF00", 0.5), null);
      }
    }
    //render enemy paths
    currentLevel.enemies.forEach((enemy) => {
      if(enemy.path !== null) {
        for(i = 0; i < enemy.path.length; i++) {
          rt.renderRectangle(currentLevel.getIndex(enemy.path[i]).transform, new Rectangle(0, tileSize / 3, tileSize / 3), new Fill("#FF9900", 0.5), null);
        }
      }
    });
  }
}