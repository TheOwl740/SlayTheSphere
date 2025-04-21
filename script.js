//MAIN LOOP
function update() {
  //increment epoch counter
  ec++;
  switch(gameState) {
    case "homescreen":
      updateHomescreen()
      break;
    case "loading":
      updateLoadscreen();
      break;
    case "inGame":
      updateCamera();
      updateGame();
      updateDebugger();
      break;
  }
}

//start timer
const gt = new GameTimer(update, 16);
gt.start();