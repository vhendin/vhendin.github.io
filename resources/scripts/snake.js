// Game variables
const boardSize = 20;
const cellSize = 20;
let snake = [{x: 10, y: 10}];
let food = generateFood();
let direction = 'right';
let nextDirection = 'right';
let score = 0;
let gameInterval;

// Generate food at random position
function generateFood() {
    let newFood;
    let foodOnSnake;
    
    do {
        foodOnSnake = false;
        newFood = {
            x: Math.floor(Math.random() * boardSize),
            y: Math.floor(Math.random() * boardSize)
        };
        
        // Check if food is on snake
        for (let segment of snake) {
            if (segment.x === newFood.x && segment.y === newFood.y) {
                foodOnSnake = true;
                break;
            }
        }
    } while (foodOnSnake);
    
    return newFood;
}

// Initialize game
function initGame() {
    const gameBoard = document.getElementById('game-board');
    gameBoard.style.width = (boardSize * cellSize) + 'px';
    gameBoard.style.height = (boardSize * cellSize) + 'px';
    
    // Start game loop
    gameInterval = setInterval(gameLoop, 150);
    
    // Set up keyboard controls
    document.addEventListener('keydown', changeDirection);
}

// Main game loop
function gameLoop() {
    // Update direction
    direction = nextDirection;
    
    // Calculate new head position
    const head = {x: snake[0].x, y: snake[0].y};
    
    switch (direction) {
        case 'up':
            head.y -= 1;
            break;
        case 'down':
            head.y += 1;
            break;
        case 'left':
            head.x -= 1;
            break;
        case 'right':
            head.x += 1;
            break;
    }
    
    // Check collision with walls
    if (head.x < 0 || head.x >= boardSize || head.y < 0 || head.y >= boardSize) {
        gameOver();
        return;
    }
    
    // Check collision with self
    for (let i = 0; i < snake.length; i++) {
        if (snake[i].x === head.x && snake[i].y === head.y) {
            gameOver();
            return;
        }
    }
    
    // Add new head to snake
    snake.unshift(head);
    
    // Check if food is eaten
    if (head.x === food.x && head.y === food.y) {
        // Increase score
        score += 10;
        document.getElementById('score').textContent = 'Score: ' + score;
        
        // Generate new food
        food = generateFood();
    } else {
        // Remove tail if no food eaten
        snake.pop();
    }
    
    // Draw game elements
    draw();
}

// Draw game elements
function draw() {
    const gameBoard = document.getElementById('game-board');
    
    // Clear board
    gameBoard.innerHTML = '';
    
    // Draw snake
    for (let i = 0; i < snake.length; i++) {
        const segment = document.createElement('div');
        segment.className = 'snake';
        segment.style.width = cellSize + 'px';
        segment.style.height = cellSize + 'px';
        segment.style.left = (snake[i].x * cellSize) + 'px';
        segment.style.top = (snake[i].y * cellSize) + 'px';
        
        gameBoard.appendChild(segment);
    }
    
    // Draw food
    const foodElement = document.createElement('div');
    foodElement.className = 'food';
    foodElement.style.width = cellSize + 'px';
    foodElement.style.height = cellSize + 'px';
    foodElement.style.left = (food.x * cellSize) + 'px';
    foodElement.style.top = (food.y * cellSize) + 'px';
    
    gameBoard.appendChild(foodElement);
}

// Change direction based on key press
function changeDirection(event) {
    switch (event.key) {
        case 'ArrowUp':
            if (direction !== 'down') nextDirection = 'up';
            break;
        case 'ArrowDown':
            if (direction !== 'up') nextDirection = 'down';
            break;
        case 'ArrowLeft':
            if (direction !== 'right') nextDirection = 'left';
            break;
        case 'ArrowRight':
            if (direction !== 'left') nextDirection = 'right';
            break;
    }
}

// Game over function
function gameOver() {
    clearInterval(gameInterval);
    alert('Game Over! Your score: ' + score);
    
    // Reset game
    snake = [{x: 10, y: 10}];
    food = generateFood();
    direction = 'right';
    nextDirection = 'right';
    score = 0;
    document.getElementById('score').textContent = 'Score: 0';
    
    // Restart game after delay
    setTimeout(() => {
        initGame();
    }, 1000);
}

// Add event listener for start button
document.addEventListener('DOMContentLoaded', function() {
    const startButton = document.getElementById('start-button');
    if (startButton) {
        startButton.addEventListener('click', function() {
            // Hide the start button after clicking it
            startButton.style.display = 'none';
            // Initialize and start the game
            initGame();
        });
    }
});
