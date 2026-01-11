//TILE SYSTEM
//tile super class
class Tile {
  constructor(transform, index, sprite, parentLevel) {
    this.transform = transform;
    this.index = index;
    this.sprite = sprite.duplicate();
    this.revealed = false;
    this.visible = false;
    this.parentLevel = parentLevel;
  }
  collider() {
    return new Collider(this.transform, tileShape);
  }
  attachOverlay() {
    if(this.overlay) {
      this.overlay.attach(this);
    }
  }
}
//wall tile class
class Wall extends Tile {
  constructor(transform, index, sprite, parentLevel, overlay) {
    super(transform, index, sprite, parentLevel);
    this.type = "wall"
    this.walkable = false;
    this.sprite.setActive(new Pair(tk.randomNum(0, 1), 3));
    this.overlay = overlay;
  }
  render() {
    if(this.revealed) {
      rt.renderImage(this.transform, this.sprite);
      if(this.overlay) {
        this.overlay.render();
      }
      if(!this.visible) {
        rt.renderRectangle(this.transform, tileShape, new Fill("#000000", 0.7), null);
      }
    }
  }
  //choose appropriate sprite to match adjacent floor positions
  assignDirectionality() {
    //find adjacent floors
    let adjFloors = [];
    for(let j = 0; j < 9; j++) {
      if(j === 4) {
        continue;
      } else {
        let adjTile = this.parentLevel.getIndex(new Pair(this.index.x + ((j % 3) - 1), this.index.y + (Math.floor(j / 3) - 1)))
        if(adjTile !== null && adjTile.type !== "wall") {
          adjFloors.push(j);
        }
      }
    }
    //choose sprites
    if(adjFloors.length > 0) {
      this.sprite.setActive(new Pair(tk.randomNum(0, 1), adjFloors.includes(1) ? 2 : 3))
    }
  }
}
//pit tile class
class Pit extends Tile {
  constructor(transform, index, sprite, parentLevel, overlay) {
    super(transform, index, sprite, parentLevel);
    this.type = "pit"
    this.walkable = false;
    this.sprite.setActive(new Pair(tk.randomNum(0, 1), 4));
    this.overlay = overlay;
    this.usingSprite = false;
  }
  render() {
    if(this.revealed) {
      if(this.usingSprite) {
        rt.renderImage(this.transform, this.sprite);
      }
      if(this.overlay) {
        this.overlay.render();
      }
      if(!this.visible) {
        rt.renderRectangle(this.transform, tileShape, new Fill("#000000", 0.7), null);
      }
    }
  }
  //choose appropriate sprite to match adjacent floor positions
  assignDirectionality() {
    //find adjacent floors
    let adjFloors = [];
    for(let j = 0; j < 9; j++) {
      if(j === 4) {
        continue;
      } else {
        let adjTile = this.parentLevel.getIndex(new Pair(this.index.x + ((j % 3) - 1), this.index.y + (Math.floor(j / 3) - 1)))
        if(adjTile !== null && adjTile.type !== "pit") {
          adjFloors.push(j);
        }
      }
    }
    //choose sprites
    if(adjFloors.length > 0) {
      this.usingSprite = adjFloors.includes(7);
    }
  }
}
//floor tile subclass
class Floor extends Tile {
  constructor(transform, index, sprite, parentLevel, overlay) {
    super(transform, index, sprite, parentLevel);
    this.type = "floor"
    this.walkable = true;
    this.entity = null;
    this.sprite.r = tk.randomNum(0, 3) * 90;
    this.sprite.setActive(new Pair(tk.randomNum(0, 1), tk.randomNum(0, 1)));
    this.overlay = overlay;
  }
  render() {
    if(this.revealed) {
      rt.renderImage(this.transform, this.sprite);
      if(this.overlay) {
        this.overlay.render();
      }
      if(!this.visible) {
        rt.renderRectangle(this.transform, tileShape, new Fill("#000000", 0.7), null);
      }
    }
  }
}
//tile overlay
class TileOverlay {
  constructor(overlayType) {
    this.type = "tile overlay";
    this.overlayType = overlayType;
    switch(overlayType) {
      case "couchLeft":
        this.sprite = images.overlays.moleHole.duplicate();
        this.sprite.setActive(new Pair(0, 0));
        break;
      case "couchRight":
        this.sprite = images.overlays.moleHole.duplicate();
        this.sprite.setActive(new Pair(1, 0));
        break;
      }
  }
  attach(parentTile) {
    this.parentTile = parentTile;
    //nonwalkable overlays
    this.parentTile.walkable = ["couchLeft", "couchRight"].includes(this.overlayType);
  }
  render() {
    rt.renderImage(this.parentTile.transform, this.sprite);
  }
}

//LEVEL TEMPLATE
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
    //populate map with walls
    for(let i = 0; i < 50; i++) {
      this.map.push([]);
      for(let ii = 0; ii < 50; ii++) {
        this.map[i][ii] = new Wall(new Pair((i - 25) * (tileSize - 1), (ii - 25) * (tileSize - 1)), new Pair(i, ii), images.tilesets.dirt, this);
      }
    }
    //molehill pre fall
    if(levelId === 0) {
      tileMaps.moleHole.pitRoom.stamp(this, new Pair(21, 21))
      this.playerSpawn = this.getIndex(new Pair(21, 21)).transform.duplicate();
    //buggy burrows
    } else {
      
    }
    //reskin floor adjacent walls and pits and attach overlays
    for(let i = 0; i < 50; i++) {
      for(let ii = 0; ii < 50; ii++) {
        let activeTile = this.map[i][ii];
        if(activeTile.type !== "floor") {
          activeTile.assignDirectionality();
        }
        activeTile.attachOverlay()
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
    //get entities that can't be walked on
    if(client.type !== "player" && client.type !== "level") {
      this.enemies.forEach((enemy) => {
        retList.push(enemy.tile.index.duplicate());
      });
    }
    //get walls
    for(let ct = 0; ct < 2500; ct++) {
      let tObj = this.map[Math.floor(ct / 50)][ct % 50];
      if(!tObj.walkable) {
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
    //lighten player tile
    player.tile.revealed = true;
    player.tile.visible = true;
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

//ROOM TEMPLATES
//room super class
class Room {
  constructor(w, h, tileset, tileOverlays, tileMap) {
    [this.w, this.h] = [w, h];
    this.tileset = tileset;
    this.tileOverlays = tileOverlays;
    this.tileMap = tileMap;
  }
  stamp(level, tlIndex) {
    let entranceIndices = [];
    for(let i = 0; i < this.w; i++) {
      for(let ii = 0; ii < this.h; ii++) {
        let activeTile = level.map[tlIndex.y + i][tlIndex.x - ii];
        switch(this.tileMap[ii][i]) {
          case 'f':
            level.map[tlIndex.y + i][tlIndex.x - ii] = new Floor(activeTile.transform.duplicate(), activeTile.index.duplicate(), this.tileset, level, null);
            break;
          case 'w':
            level.map[tlIndex.y + i][tlIndex.x - ii] = new Wall(activeTile.transform.duplicate(), activeTile.index.duplicate(), this.tileset, level, null);
            break;
          case 'p':
            level.map[tlIndex.y + i][tlIndex.x - ii] = new Pit(activeTile.transform.duplicate(), activeTile.index.duplicate(), this.tileset, level, null);
            break;
          case 'e':
            level.map[tlIndex.y + i][tlIndex.x - ii] = new Floor(activeTile.transform.duplicate(), activeTile.index.duplicate(), this.tileset, level, null);
            entranceIndices.push(activeTile.index.duplicate());
            break;
          }
      }
    }
    this.tileOverlays.forEach((overlayModule) => {
      let targetTile = level.map[tlIndex.x + overlayModule.index.x][tlIndex.y - overlayModule.index.y];
      targetTile.overlay = overlayModule.overlay;
    });
    return entranceIndices;
  }
}

const tileMaps = {
  moleHole: {
    pitRoom: new Room(6, 4, images.tilesets.dirt, [
      {
        overlay: new TileOverlay("couchLeft"),
        index: new Pair(1, 1)
      },
      {
        overlay: new TileOverlay("couchRight"),
        index: new Pair(2, 1)
      }
    ], [
      ['f','f','f','f','f','f'],
      ['f','f','f','f','p','p'],
      ['f','f','f','f','p','p'],
      ['f','f','e','f','f','f'],
    ]),
  }
}