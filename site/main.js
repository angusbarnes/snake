const MAP_HEIGHT = 12;
const MAP_WIDTH = 18;
const TILE_SIZE = 16;

var snake;
var food;
var cursors;

//  Direction consts
var UP = 0;
var DOWN = 1;
var LEFT = 2;
var RIGHT = 3;
var START = -1;

let touchStartX;
let touchStartY;
let touchEndX;
let touchEndY;

let score_text;
let score_count;
let dead_text;

class Example extends Phaser.Scene
{
    text;

    preload ()
    {
        this.load.image("food", "assets/food.png");
        this.load.image("body", "assets/body.png");
    }

    create ()
    {
        var Food = new Phaser.Class({
            Extends: Phaser.GameObjects.Image,
        
            initialize: function Food(scene, x, y) {
              Phaser.GameObjects.Image.call(this, scene);
        
              this.setTexture("food");
              this.setPosition(x * 16, y * 16);
              this.setOrigin(0);
        
              this.total = 0;
        
              scene.children.add(this);
            },
        
            eat: function () {
              this.total++;
            },
          });
        
          var Snake = new Phaser.Class({
            initialize: function Snake(scene, x, y) {
              this.headPosition = new Phaser.Geom.Point(x, y);
        
              this.body = scene.add.group();
        
              this.head = this.body.create(x * 16, y * 16, "body");
              this.head.setOrigin(0);
        
              this.alive = true;
        
              this.speed = 150;
        
              this.moveTime = 0;
        
              this.tail = new Phaser.Geom.Point(x, y);
        
              this.heading = RIGHT;
              this.direction = RIGHT;
            },
        
            update: function (time) {
              if (time >= this.moveTime) {
                return this.move(time);
              }
            },
        
            faceLeft: function () {
              if (this.direction === UP || this.direction === DOWN) {
                this.heading = LEFT;
              }
            },
        
            faceRight: function () {
              if (this.direction === UP || this.direction === DOWN) {
                this.heading = RIGHT;
              }
            },
        
            faceUp: function () {
              if (this.direction === LEFT || this.direction === RIGHT) {
                this.heading = UP;
              }
            },
        
            faceDown: function () {
              if (this.direction === LEFT || this.direction === RIGHT) {
                this.heading = DOWN;
              }
            },
        
            move: function (time) {
              /**
               * Based on the heading property (which is the direction the pgroup pressed)
               * we update the headPosition value accordingly.
               *
               * The Math.wrap call allow the snake to wrap around the screen, so when
               * it goes off any of the sides it re-appears on the other.
               */
              switch (this.heading) {
                case LEFT:
                  this.headPosition.x = Phaser.Math.Wrap(this.headPosition.x - 1, 0, MAP_WIDTH + 1);
                  break;
        
                case RIGHT:
                  this.headPosition.x = Phaser.Math.Wrap(this.headPosition.x + 1, -1, MAP_WIDTH);
                  break;
        
                case UP:
                  this.headPosition.y = Phaser.Math.Wrap(this.headPosition.y - 1, 0, MAP_HEIGHT + 1);
                  break;
        
                case DOWN:
                  this.headPosition.y = Phaser.Math.Wrap(this.headPosition.y + 1, -1, MAP_HEIGHT);
                  break;
                case START:
                  break;
              }
        
              this.direction = this.heading;
        
              //  Update the body segments and place the last coordinate into this.tail
              Phaser.Actions.ShiftPosition(
                this.body.getChildren(),
                this.headPosition.x * 16,
                this.headPosition.y * 16,
                1,
                this.tail
              );
        
              //  Check to see if any of the body pieces have the same x/y as the head
              //  If they do, the head ran into the body
        
              var hitBody = Phaser.Actions.GetFirst(
                this.body.getChildren(),
                { x: this.head.x, y: this.head.y },
                1
              );
        
              if (hitBody) {
                console.log("dead");
                postHighScore(score_count)
                dead_text.text = "YOU DIED!";
                this.alive = false;
        
                return false;
              } else {
                //  Update the timer ready for the next movement
                this.moveTime = time + this.speed;
        
                return true;
              }
            },
        
            grow: function () {
              var newPart = this.body.create(this.tail.x, this.tail.y, "body");
        
              newPart.setOrigin(0);
            },
        
            collideWithFood: function (food) {
              if (this.head.x === food.x && this.head.y === food.y) {
                this.grow();
                food.eat();
        
                //  For every 5 items of food eaten we'll increase the snake speed a little
                if (this.speed > 20 && food.total % 5 === 0) {
                  this.speed -= 5;
                }
        
                return true;
              } else {
                return false;
              }
            },
        
            updateGrid: function (grid) {
              //  Remove all body pieces from valid positions list
              this.body.children.each(function (segment) {
                var bx = segment.x / 16;
                var by = segment.y / 16;
        
                grid[by][bx] = false;
              });
        
              return grid;
            },
          });
        
          food = new Food(this, 0, 0);
          snake = new Snake(this, 8, 8);
        
          //  Create our keyboard controls
          cursors = this.input.keyboard.createCursorKeys();
          score_text = this.add.text(5, 5, "", { fontFamily: "Silkscreen, monospace", fontSize: 28 });
          dead_text = this.add.text(40, 20, "", { color: "red", fontFamily: "Silkscreen, monospace", fontSize: 40 })
          
          score_text.setDepth(10);
          dead_text.setDepth(10);
          score_count = 0;
        
          repositionFood(food);

        //  Every time you click, fade the camera
        this.input.once('pointerdown', () => {
            if (!snake.alive) {
                this.scene.restart();
            }
        });

          // Event listener for touch start
this.input.on('pointerdown', function (pointer) {
    if (!snake.alive) {
        this.scene.restart();
    }
    touchStartX = pointer.x;
    touchStartY = pointer.y;
  });
  
  // Event listener for touch end
this.input.on('pointerup', function (pointer) {
    touchEndX = pointer.x;
    touchEndY = pointer.y;
  
    // Calculate swipe direction based on touch start and end coordinates
    let swipeDirection = calculateSwipeDirection();
  
    // Perform snake movement based on swipe direction
    if (swipeDirection === 'left') {
      snake.faceLeft();
    } else if (swipeDirection === 'right') {
      snake.faceRight();
    } else if (swipeDirection === 'up') {
      snake.faceUp();
    } else if (swipeDirection === 'down') {
      snake.faceDown();
    }
  });
    }

    update (time, delta)
    {
        if (!snake.alive) {
            return;
          }
        
          /**
           * Check which key is pressed, and then change the direction the snake
           * is heading based on that. The checks ensure you don't double-back
           * on yourself, for example if you're moving to the right and you press
           * the LEFT cursor, it ignores it, because the only valid directions you
           * can move in at that time is up and down.
           */
          if (cursors.left.isDown) {
            snake.faceLeft();
          } else if (cursors.right.isDown) {
            snake.faceRight();
          } else if (cursors.up.isDown) {
            snake.faceUp();
          } else if (cursors.down.isDown) {
            snake.faceDown();
          }
        
          if (snake.update(time)) {
            //  If the snake updated, we need to check for collision against food
        
            if (snake.collideWithFood(food)) {
              if (repositionFood()) {
                score_count += 1;
                score_text.text = score_count.toString();
              }
            }
          }
    }
}


// Select DPAD buttons
// const upButton = document.querySelector('.up-btn');
// const downButton = document.querySelector('.down-btn');
// const leftButton = document.querySelector('.left-btn');
// const rightButton = document.querySelector('.right-btn');

// // Event listeners for DPAD buttons
// upButton.addEventListener('click', () => {
//   // Code to move the snake character up in your game logic
//   snake.faceUp(); // Replace with your actual game logic
// });

// downButton.addEventListener('click', () => {
//   // Code to move the snake character down in your game logic
//   snake.faceDown(); // Replace with your actual game logic
// });

// leftButton.addEventListener('click', () => {
//   // Code to move the snake character left in your game logic
//   snake.faceLeft(); // Replace with your actual game logic
// });

// rightButton.addEventListener('click', () => {
//   // Code to move the snake character right in your game logic
//   snake.faceRight(); // Replace with your actual game logic
// });


var config = {
  type: Phaser.AUTO,
  width: MAP_WIDTH * TILE_SIZE + TILE_SIZE,
  height: MAP_HEIGHT * TILE_SIZE + TILE_SIZE,
  backgroundColor: "#bfcc00",
  parent: "game-element",
  scene: Example,
};

var game = new Phaser.Game(config);

// Function to calculate swipe direction based on touch input
function calculateSwipeDirection() {
  let deltaX = touchEndX - touchStartX;
  let deltaY = touchEndY - touchStartY;
  let swipeThreshold = 20; // Adjust the threshold as needed

  if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > swipeThreshold) {
    // Horizontal swipe
    return (deltaX > 0) ? 'right' : 'left';
  } else if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > swipeThreshold) {
    // Vertical swipe
    return (deltaY > 0) ? 'down' : 'up';
  }

  // If no significant swipe detected
  return null;
}

/**
 * We can place the food anywhere in our 40x30 grid
 * *except* on-top of the snake, so we need
 * to filter those out of the possible food locations.
 * If there aren't any locations left, they've won!
 *
 * @method repositionFood
 * @return {boolean} true if the food was placed, otherwise false
 */
function repositionFood() {
  //  First create an array that assumes all positions
  //  are valid for the new piece of food

  //  A Grid we'll use to reposition the food each time it's eaten
  var testGrid = [];

  for (var y = 0; y < 30; y++) {
    testGrid[y] = [];

    for (var x = 0; x < 40; x++) {
      testGrid[y][x] = true;
    }
  }

  snake.updateGrid(testGrid);

  //  Purge out false positions
  var validLocations = [];

  for (var y = 0; y < MAP_HEIGHT; y++) {
    for (var x = 0; x < MAP_WIDTH; x++) {
      if (testGrid[y][x] === true) {
        //  Is this position valid for food? If so, add it here ...
        validLocations.push({ x: x, y: y });
      }
    }
  }

  if (validLocations.length > 0) {
    //  Use the RNG to pick a random food position
    var pos = Phaser.Math.RND.pick(validLocations);

    //  And place it
    food.setPosition(pos.x * 16, pos.y * 16);

    return true;
  } else {
    return false;
  }
}

// Assuming you have a variable `score` that holds the player's score

// Function to send high score to the server
function postHighScore(score) {
  const username = localStorage.getItem('username'); // Replace this with the player's username or ID
  const token = localStorage.getItem('token'); // Replace this with the JWT token (if needed)

  // Prepare the data to be sent in the request body
  const data = {
    username: username,
    score: score,
    token: token, // Include the token if required for authentication on the server
  };

  fetch("/highscore", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })
    .then((response) => {
      if (response.ok) {
        console.log("High score submitted successfully");
        // You may want to handle the response here if needed
      } else {
        console.error("Failed to submit high score");
        // Handle the failed submission here
      }
    })
    .catch((error) => {
      console.error("Error occurred while submitting high score:", error);
      // Handle errors here
    });
}
