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
}
//wall tile class
class Wall extends Tile {
  constructor(transform, index, sprite, parentLevel, overlay) {
    super(transform, index, sprite, parentLevel);
    this.type = "wall"
    this.walkable = false;
    this.sprite.setActive(new Pair(tk.randomNum(2, 3), 3));
    this.overlay = overlay;
  }
  render() {
    if(this.revealed) {
      rt.renderImage(this.transform, this.sprite);
      if(!this.visible) {
        rt.renderRectangle(this.transform, tileShape, new Fill("#000000", 0.7), null);
      }
    }
    if(this.overlay) {
      this.overlay.render();
    }
  }
  //choose appropriate sprite to match adjacent floor positions
  assignDirectionality() {
    //find adjacent floors
    let adjWalls = [];
    for(let j = 0; j < 9; j++) {
      if(j === 4) {
        continue;
      } else {
        let adjTile = this.parentLevel.getIndex(new Pair(this.index.x + ((j % 3) - 1), this.index.y + (Math.floor(j / 3) - 1)))
        if(adjTile !== null && adjTile.type !== "wall") {
          adjWalls.push(j);
        }
      }
    }
    //choose sprites
    if(adjWalls.length > 0) {
      this.sprite.setActive(new Pair(tk.randomNum(0, 1), adjWalls.includes(1) ? 2 : 3))
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
      if(!this.visible) {
        rt.renderRectangle(this.transform, tileShape, new Fill("#000000", 0.7), null);
      }
    }
    if(this.overlay) {
      this.overlay.render();
    }
  }
}
//tile overlay
class TileOverlay {
  constructor(overlayType, parent) {
    this.parent = parent;
    this.type = "tile overlay";
    this.overlayType = overlayType;
  }
  apply() {
  }
  render() {
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
        this.map[i][ii] = new Wall(new Pair((i - 25) * (tileSize - 1), (ii - 25) * (tileSize - 1)), new Pair(i, ii), images.tilesets.basic, this);
      }
    }
    //molehill pre fall
    if(levelId === 0) {
      tileMaps.moleHole.testRoom.stamp(this, new Pair(21, 21))
      this.playerSpawn = this.getIndex(new Pair(21, 21)).transform.duplicate();
    //buggy burrows
    } else {
      
    }
    //reskin floor adjacent walls
    for(let i = 0; i < 50; i++) {
      for(let ii = 0; ii < 50; ii++) {
        let activeTile = this.map[i][ii];
        if(activeTile.type === "wall") {
          activeTile.assignDirectionality();
        }
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
  constructor(w, h, entranceIndices, floorSprite, tileOverlays, tileMap) {
    [this.w, this.h] = [w, h];
    this.entranceIndices = entranceIndices;
    this.floorSprite = floorSprite;
    this.tileOverlays = tileOverlays;
    this.tileMap = tileMap;
  }
  stamp(level, tlIndex) {
    for(let i = 0; i < this.w; i++) {
      for(let ii = 0; ii < this.h; ii++) {
        let activeTile = level.map[tlIndex.y + i][tlIndex.x - ii];
        if(this.tileMap[ii][i] === "f") {
          level.map[tlIndex.y + i][tlIndex.x - ii] = new Floor(activeTile.transform.duplicate(), activeTile.index.duplicate(), this.floorSprite, level, null);
        } else {
          level.map[tlIndex.y + i][tlIndex.x - ii] = new Wall(activeTile.transform.duplicate(), activeTile.index.duplicate(), this.floorSprite, level, null);
        }
      }
    }
    this.tileOverlays.forEach((overlayModule) => {
      let targetTile = level.map[tlIndex.x + overlayModule.index.x][tlIndex.y + overlayModule.index.y];
      targetTile.overlay = overlayModule.overlay;
      targetTile.overlay.apply();
    });
  }
}

const tileMaps = {
  moleHole: {
    testRoom: new Room(5, 6, [], images.tilesets.basic, [], [
      ['f','f','f','f','f'],
      ['f','f','w','f','f'],
      ['f','w','w','w','w'],
      ['f','f','w','f','f'],
      ['f','f','f','f','f'],
      ['f','f','f','f','f']
    ])
  }
}