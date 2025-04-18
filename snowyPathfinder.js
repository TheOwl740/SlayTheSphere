//pathfinder class, takes in a grid matrix of tiles. Tiles must have a boolean walkable property
class PathingController {
  constructor(grid) {
    //the matrix of tiles to pathfind across
    this.grid = grid;
  }
  octile(a, b) {
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    return (dx < dy) ? 0.4 * dx + dy : 0.4 * dy + dx;
  }
  pathfind(originIndex, targetIndex) {
    
  }
}
//pathfinding node class to track pathfind progress
class PathNode {
  constructor(controller, parentNode, index, targetIndex) {
    //PathingController object this node is attached to
    this.controller = controller;
    //parent node object, or null if this is the first node
    this.parentNode = parentNode;
    //target index
    this.targetIndex = targetIndex;
    //this node's index
    this.index = index;
    //path distance from start to this node
    this.g = (parentNode === null) ? 0 : (parentNode.g + controller.octile(parentNode.index, this.index));
    //octile distance from this node's index to target index
    this.h = controller.octile(this.index, targetIndex);
    //attractiveness score composed of above values
    this.f = this.g + this.h;
  }
}