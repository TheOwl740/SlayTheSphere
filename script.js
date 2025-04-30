//MAIN LOOP
function update() {
  //increment epoch counter
  ec++;
  //update button count
  bc.update();
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
      updateHUD();
      break;
    case "skillTree":
      updateSkillTree();
      break;
    case "gameOver":
      updateFailscreen();
      break;
  }
}

//start timer
gt = new GameTimer(update, 16);
gt.start();