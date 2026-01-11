//CLASSES
//effect control class
class EffectController {
  constructor() {
    this.activeEffects = [];
  }
  add(effect) {
    this.activeEffects.push(effect);
  }
  update() {
    let effect;
    for(let ei = 0; ei < this.activeEffects.length; ei++) {
      effect = this.activeEffects[ei];
      //delete expired effects
      if(effect.remainingDuration <= 0) {
        this.activeEffects.splice(ei, 1);
        ei--;
        continue;
      }
      //increment timer and render
      effect.update();
    }
  }
}
//effect class template
class Effect {
  constructor(duration, transform) {
    this.remainingDuration = duration;
    this.transform = transform.duplicate();
  }
}
//damage number effect subclass
class DamageNumber extends Effect {
  constructor(attackAction) {
    super(60, attackAction.targetEntity.transform);
    this.sourceAttack = attackAction;
  }
  update() {
    this.remainingDuration--;
    if(this.sourceAttack.actor.tile.visible) {
      rt.renderText(this.transform.add(new Pair(Math.sin(ec / 10) * 0.1, 0.1)), new TextNode("pixelFont", "-" + this.sourceAttack.damage, 0, (landscape ? cs.w / 50 : cs.h / 35), "center"), new Fill(this.sourceAttack.surprise ? "#ffff00" : "#561919", this.remainingDuration / 60));
    }
  }
}
//xp gain effect
class XPEffect extends Effect {
  constructor(xpCount) {
    super(60, player.transform.duplicate().add(new Pair(0, tileSize)));
    this.xpCount = xpCount;
  }
  update() {
    this.remainingDuration--;
    rt.renderText(this.transform.add(new Pair(Math.sin(ec / 10) * 0.1, 0.1)), new TextNode("pixelFont", "+" + this.xpCount + "xp", 0, (landscape ? cs.w : cs.h) / 30, "center"), new Fill("#c4b921", this.remainingDuration / 60));
  }
}
//skill point gain effect
class SPEffect extends Effect {
  constructor(pointCount) {
    super(120, player.transform);
    this.pointCount = pointCount;
  }
  update() {
    this.remainingDuration--;
    rt.renderText(this.transform.add(new Pair(Math.sin(ec / 10) * 0.1, 0.1)), new TextNode("pixelFont", `+${this.pointCount} Skill Point${this.pointCount > 1 ? "s" : ""}!`, 0, (landscape ? cs.w : cs.h) / 30, "center"), new Fill("#c4b921", this.remainingDuration / 120));
  }
}
//cube death subclass
class CubeDeath extends Effect {
  constructor(cube) {
    super(60, cube.transform);
    this.cube = cube;
  }
  update() {
    this.remainingDuration--;
    if(this.cube.tile.visible) {
      rt.renderRectangle(this.transform, new Rectangle(0, this.cube.shape.w * (this.remainingDuration / 60), this.cube.shape.h * (this.remainingDuration / 60)), new Fill(this.cube.fill.color, this.remainingDuration / 60), null);
    }
  }
}
class NewLevelEffect extends Effect {
  constructor() {
    super(300, new Pair(cs.w / 2, cs.h / -2).add(rt.camera))
  }
  update() {
    this.remainingDuration--;
    if(this.remainingDuration > 150) {
      if(currentLevel.levelId !== 0) {
        rt.renderText(this.transform, new TextNode("pixelFont", `-Floor ${currentLevel.levelId}-`, 0, (cs.w / 10) * (this.remainingDuration / 150), "center"), new Fill("#FFFFFF", 1));
      }
      rt.renderText(this.transform.duplicate().subtract(new Pair(0, landscape ? cs.w / 10 : cs.h / 10)), new TextNode("pixelFont", currentLevel.zone, 0, (cs.w / 15) * (this.remainingDuration / 150), "center"), new Fill("#FFFFFF", 1));
    } else {
      if(currentLevel.levelId !== 0) {
        rt.renderText(this.transform, new TextNode("pixelFont", `-Level ${currentLevel.levelId}-`, 0, cs.w / 10, "center"), new Fill("#FFFFFF", this.remainingDuration / 150));
      }
      rt.renderText(this.transform.duplicate().subtract(new Pair(0, landscape ? cs.w / 10 : cs.h / 10)), new TextNode("pixelFont", currentLevel.zone, 0, (cs.w / 15), "center"), new Fill("#FFFFFF", this.remainingDuration / 150));
    }
  }
}
class WaitEffect extends Effect {
  constructor(waitAction) {
    super(100, waitAction.actor.transform);
    this.actor = waitAction.actor;
  }
  update() {
    this.remainingDuration--;
    if(this.actor.tile.visible) {
      rt.renderText(this.transform.add(new Pair(Math.sin(ec / 10) * 0.1, 0.1)), new TextNode("pixelFont", "z", 0, (landscape ? cs.w : cs.h) / 30, "center"), new Fill("#8500d2", this.remainingDuration / 100));
    }
  }
}