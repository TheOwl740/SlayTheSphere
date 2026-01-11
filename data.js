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
  moles: {
    marshallMole: {
      body: new Sprite(tk.generateImage("Assets/Moles/MarshallMole/body.png"), 1, 0, 0, 0, 200, 200, false, false, 32, 32)
    }
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