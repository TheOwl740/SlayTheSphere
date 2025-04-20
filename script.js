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

//TIMER CONSTANT
const timer = setInterval(update, 16);