//MAIN LOOP
function update() {
  //increment epoch counter
  ec++;
  switch(gameState) {
    case "homescreen":
      updateHomescreen()
      break;
    case "loading":
      //instantiate objects
      currentLevel = new Level();
      player = new Player();
      //start game
      gameState = "inGame";
      break;
    case "inGame":
      renderAll();
      break;
  }
}

//TIMER CONSTANT
const timer = setInterval(update, 16);