//ENVIRONMENT INITIALIZATION
//engine tool constants
const cs = new Canvas(document.getElementById("canvas"));
const rt = new RenderTool(cs);
const et = new EventTracker();
const tk = new Toolkit();
//canvas initialization
cs.setDimensions(window.innerWidth, window.innerHeight);

//GLOBAL VARIABLES
//epoch counter (ticks since game start)
let ec = 0;
//current game state for script handling
let gameState = "homescreen";
//current level object or null when loading
let currentLevel = null;
//player object or null when loading
let player = null;

//GLOBAL OBJECTS
//player object
class Player {
  constructor() {
    this.transform = new Pair(0, 0);
    this.shape = new Shape([
      new Pair(-25, 25),
      new Pair(25, 25),
      new Pair(0, 25)
    ], 0);
    this.fill = new Fill("#6262e7", 1);
  }
  collider() {
    return new Collider(player.transform, player.shape);
  }
}

//CLASSES
//map and level dependents class
class Level {
  constructor() {
    //data initialization
    this.map = [];
    this.shadowMask = [];
    this.items = [];
    this.enemies = [];
    //map generation
  }
  update() {

  }
}
//enemy class
class Enemy {
  constructor(transform) {
    this.transform = transform;
    this.shape = new Circle(50);
    this.fill = new Fill("#e0a204");
  }
  update() {

  }
  collider() {
    return new Collider(this.transform, this.shape);
  }
}

//FUNCTIONS
//renders everything during game
function renderAll() {
  
}

//renders and updates button on homescreen
function updateHomescreen() {
  //rendering
  cs.fillAll(new Fill("#000000", 1));
  rt.renderCircle(new Pair(cs.w / 2, cs.h / -2), new Circle((cs.w / 2) * (((Math.sin(ec / 50) + 1) / 8) + 1)), new Fill("#e0a204", (Math.sin(ec / 50) + 2) / 4), null);
  rt.renderCircle(new Pair(cs.w / 2, cs.h / -2), new Circle((cs.w / 3) * (((Math.sin(ec / 25) + 1) / 8) + 1)), new Fill("#e0a204", (Math.sin(ec / 25) + 2) / 4), null);
  rt.renderText(new Pair(cs.w / 2, cs.h / -2), new TextNode("Courier New", "Slay the Sphere", 0, cs.w / 40, "center"), new Fill("#EEEEFF", 1));
  rt.renderText(new Pair(cs.w / 2, (cs.h / -2) - cs.w / 40), new TextNode("Courier New", "- click anywhere to begin -", 0, cs.w / 80, "center"), new Fill("#EEEEFF", 1));
  //game start
  if(et.getClick("left")) {
    gameState = "loading";
  }
}