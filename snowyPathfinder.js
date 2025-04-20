//pathfinder class, takes in a grid matrix of tiles. Tiles must have a boolean walkable property
class PathfindingController {
  constructor(grid) {
    //the matrix of tiles to pathfind across
    this.grid = grid;
  }
  octile(a, b) {
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    return (dx < dy) ? 0.4 * dx + dy : 0.4 * dy + dx;
  }
  getNeighborIndices(index, closed) {
    let neighbors = [];
    for(let x = -1; x <= 1; x++) {
      for(let y = -1; y <= 1; y++) {
        const selectedTile = this.grid[index.x + x][index.y + y];
        if(selectedTile !== undefined && (!selectedTile.index.isEqualTo(index)) && selectedTile.walkable) {
          let isClosed = false;
          closed.forEach(closedNode => {
            if(closedNode.index.isEqualTo(selectedTile.index)) {
              isClosed = true;
            }
          });
          if(!isClosed) {
            neighbors.push(selectedTile.index);
          }
        }
      }
    }
    return neighbors;
  }
  pathfind(originIndex, targetIndex) {
    //nodes to be evaluated list
    const open = [new PathNode(this, null, originIndex, targetIndex)];
    //nodes already evaluated list initialised with start node
    const closed = [];
    //current set to start node
    let current;
    //while there are nodes to be evaluated
    while(open.length > 0) {
      //best node option tracker
      let bestNode = null;
      //check each open node
      open.forEach((pathNode) => {
        //if the current path node is better than the best yet
        if(bestNode === null || pathNode.f < bestNode.f || (pathNode.f === bestNode.f && pathNode.h < bestNode.h)) {
          //reassign best to the new best
          bestNode = pathNode;
        }
      });
      //assign current to best node
      current = bestNode;
      //add current to closed
      closed.push(current);
      //remove current from open
      for(let node = 0; node < open.length; node++) {
        if(open[node] === current) {
          open.splice(node, 1);
          break;
        }
      }
      //if target reached
      if(current.index.isEqualTo(targetIndex)) {
        let path = [];
        let pathObj = current;
        while(pathObj.parentNode !== null) {
          path.push(pathObj.index);
          pathObj = pathObj.parentNode;
        }
        return path.reverse();
      }
      //add valid neighbors to open
      this.getNeighborIndices(current.index, closed).forEach((neighborIndex) => {
        open.push(new PathNode(this, current, neighborIndex, targetIndex));
      });
    }
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