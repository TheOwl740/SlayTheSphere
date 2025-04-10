//MAIN LOOP
function update() {
  //increment epoch counter
  ec++;
  switch(gameState) {
    case "homescreen":
      updateHomescreen()
      break;
    case "loading":
      loadNewLevel();
      break;
    case "inGame":
      updateCamera();
      updateGame();
      break;
  }
}

//TIMER CONSTANT
const timer = setInterval(update, 16);