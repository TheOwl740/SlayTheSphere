//FUNCTIONS
//renders everything during game and updates turns and controls
function updateGame() {
  //update turn control
  currentTC.update();
  //canvas clear
  cs.fillAll(new Fill("#000000", 1));
  //render map
  currentLevel.render();
  //render player
  player.render();
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
  //create new turn controller
  currentTC = new TurnController();
  //instantiate and generate new level
  currentLevel = new Level(currentLevel?.levelCount + 1 || 1);
  //create new or apply transform to existing player
  if(player === null) {
    player = new Player(currentLevel.playerSpawn)
  } else {
    player.transform = currentLevel.playerSpawn;
  }
  //initialize turn controller data
  currentTC.initialize();
  //lock camera to player
  rt.camera = new Pair(player.transform.x - (cs.w / 2), player.transform.y + (cs.h / 2));
  //start game
  gameState = "inGame";
}
//renders healthbar of an object, provided it has a health and transform object attached
function renderHealthbar(targetObj, yOffset) {
  rt.renderRectangle(targetObj.transform.duplicate().add(new Pair(0, yOffset)), new Rectangle(0, tileSize * 0.75, tileSize * 0.2), new Fill("#d60000", 0.5), null);
  rt.renderRectangle(targetObj.transform.duplicate().add(new Pair(0, yOffset)), new Rectangle(0, tileSize * 0.7 * (targetObj.health.current / targetObj.health.max), tileSize * 0.175), new Fill("#16d700", 0.5), null)
}
//updates the loadscreen before next level
function updateLoadscreen() {
  cutsceneCount++;
  if(cutsceneCount < 100) {
    cs.fillAll(new Fill("#000000", 0.07));
  } else {
    cutsceneCount = 0;
    loadNewLevel();
  }
}