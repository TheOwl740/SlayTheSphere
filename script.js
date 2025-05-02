//MAIN LOOP
function update() {
  //increment epoch counter
  ec++;
  //update button count
  bc.update();
  //update tap control
  if(!landscape) {
    tapData.update();
  }
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
    case "tutorial":
      updateTutorial();
      break;
  }
}

//start timer
gt = new GameTimer(update, 16);
gt.start();