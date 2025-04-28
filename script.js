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
      renderHUD();
      break;
    case "gameOver":
      updateFailscreen();
      break;
  }
}

//start timer
gt = new GameTimer(update, 16);
gt.start();