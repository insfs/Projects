/* Variable Initialisation */
let gameGrid = []; // 2D array of tile elements
let gridRows = 16; // default number of rows
let gridColumns = 16; // default number of columns
let totalMines = 40; // total mines placed defaulted to 40 for 16x16 grid
let minePositions = [];
let revealedTileCount = 0; // tracks how many safe tiles have been revealed to detect win condition
let isGameOver = false;
let isFirstClick = true;

function flagIMG() {
    return `<img src="flag.png" class="tile-icon" alt="flag">`;
}

function bombIMG() {
    return `<img src="bomb.png" class="tile-icon" alt="bomb">`;
}

/* Initialise Game */
window.addEventListener("DOMContentLoaded", () => {
    initDropdown();
    loadDifficulty();
    setupOutsideClickClose();
});

// Setup dropdown open/close behaviour
function initDropdown() {
    const dropdown = document.getElementById("difficultyDropdown");
    const selected = document.getElementById("difficultySelected");
    const options = document.getElementById("difficultyOptions");

    selected.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdown.classList.toggle("open");
    });

    // Apply selected difficulty
    options.querySelectorAll("li").forEach(option => {
        option.addEventListener("click", (e) => {
            e.stopPropagation();

            const difficultyValue = option.getAttribute("data-value");
            const difficultyLabel = option.innerText;

            selected.innerText = difficultyLabel;
            localStorage.setItem("minesweeperDifficulty", difficultyValue);

            dropdown.classList.remove("open");
            applyDifficulty(difficultyValue);
        });
    });
}

/* Close dropdown if clicking outside */
function setupOutsideClickClose() {
    document.addEventListener("click", (e) => {
        const dropdown = document.getElementById("difficultyDropdown");

        if (dropdown.classList.contains("open") && !dropdown.contains(e.target)) {
            dropdown.classList.remove("open");
        }
    });
}

/* Load saved difficulty */
function loadDifficulty() {
    const savedDifficulty = localStorage.getItem("minesweeperDifficulty") || "medium";

    const difficultyLabels = {
        easy: "Easy",
        medium: "Medium",
        hard: "Hard"
    };

    document.getElementById("difficultySelected").innerText = difficultyLabels[savedDifficulty];
    applyDifficulty(savedDifficulty);
}


// Update board size and mine count based on difficulty
function applyDifficulty(mode) {

    // If no mode provided, try to load from localStorage or default to medium
    if (!mode) {
        mode = localStorage.getItem("minesweeperDifficulty") || "medium";
    }

    if (mode === "easy") {
        gridRows = 8;
        gridColumns = 8;
        totalMines = 10;
    }

    else if (mode === "medium") {
        gridRows = 16;
        gridColumns = 16;
        totalMines = 40;
    }

    else if (mode === "hard") {
        gridRows = 24;
        gridColumns = 24;
        totalMines = 90;
    }

    /* 
    Future Implementation for custom size  
    ((gridRows * gridColumns) /  (8*8)) * 10
    for example would give 40 mines for a 16x16 grid: (16 * 16) / (8 * 8) * 10 = 40
    */

    resetGame();
    startGame();
}

/* Reset all game state and clear board */
function resetGame() {
    gameGrid = [];
    minePositions = [];
    revealedTileCount = 0;
    isGameOver = false;
    isFirstClick = true;
    document.getElementById("board").innerHTML = "";
}

// Build board UI and attach event listeners
function startGame() {
    const totalTiles = gridRows * gridColumns;
    const safeTiles = totalTiles - totalMines;

    // Update stats panel
    document.getElementById("mines-count").innerText = totalMines;
    document.getElementById("safe-count").innerText = safeTiles;
    document.getElementById("total-count").innerText = totalTiles;
    document.getElementById("remaining-count").innerText = safeTiles;

    const boardDiv = document.getElementById("board");
    boardDiv.style.setProperty("--cols", gridColumns);
    boardDiv.style.setProperty("--rows", gridRows);

    // Scale icons and font based on board size
    let iconSize;
    if (gridColumns <= 8) {
        iconSize = "88%";
    } else if (gridColumns <= 16) {
        iconSize = "78%";
    } else {
        iconSize = "68%";
    }

    let tileFont;
    if (gridColumns <= 8) {
        tileFont = "1.2rem";
    } else if (gridColumns <= 16) {
        tileFont = "1.0rem";
    } else {
        tileFont = "0.85rem";
    }

    boardDiv.style.setProperty("--icon-size", iconSize);
    boardDiv.style.setProperty("--tile-font", tileFont);

    // Create tile elements
    for (let rowIndex = 0; rowIndex < gridRows; rowIndex++) {
        let rowArray = [];
        for (let colIndex = 0; colIndex < gridColumns; colIndex++) {
            let tile = document.createElement("div");
            tile.id = `${rowIndex}-${colIndex}`;
            tile.addEventListener("click", clickTile);
            tile.addEventListener("contextmenu", rightClickTile);

            boardDiv.append(tile);
            rowArray.push(tile);
        }

        gameGrid.push(rowArray);
    }
}

// Ensures first click and its neighbors are always safe
function generateSafeMines(firstRow, firstCol) {

    minePositions = [];
    let minesRemaining = totalMines;
    const forbiddenTiles = new Set();

    // Block first tile and its 8 neighbors
    for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
        for (let colOffset = -1; colOffset <= 1; colOffset++) {

            const neighborRow = firstRow + rowOffset;
            const neighborCol = firstCol + colOffset;

            if (neighborRow >= 0 && neighborRow < gridRows &&
                neighborCol >= 0 && neighborCol < gridColumns) {
                forbiddenTiles.add(`${neighborRow}-${neighborCol}`);
            }
        }
    }

    // Randomly place mines outside forbidden zone
    while (minesRemaining > 0) {
        const randomRow = Math.floor(Math.random() * gridRows);
        const randomCol = Math.floor(Math.random() * gridColumns);
        const tileId = `${randomRow}-${randomCol}`;

        if (forbiddenTiles.has(tileId)) {
            continue;
        }

        if (minePositions.includes(tileId)) {
            continue;
        }

        minePositions.push(tileId);
        minesRemaining--;
    }
}

// Right-click to toggle flag
function rightClickTile(e) {
    e.preventDefault();
    if (isGameOver) {
        return;
    }

    if (this.classList.contains("tile-clicked")) {
        return;
    }

    this.classList.toggle("flagged");

    if (this.classList.contains("flagged")) {
        this.innerHTML = flagIMG();
    } else {
        this.innerHTML = "";
    }
}

// Left-click to reveal tile
function clickTile() {
    if (isGameOver || this.classList.contains("tile-clicked")) {
        return;
    }

    if (this.classList.contains("flagged")) {
        return;
    }

    const tile = this;
    const [rowIndex, colIndex] = tile.id.split("-").map(Number);

    // Generate mines only after first click
    if (isFirstClick) {
        isFirstClick = false;
        generateSafeMines(rowIndex, colIndex);
    }

    // Mine hit game over
    if (minePositions.includes(tile.id)) {
        isGameOver = true;
        revealMines();
        return;
    }

    checkMine(rowIndex, colIndex);
}

// Show all mines when game ends
function revealMines() {
    for (let rowIndex = 0; rowIndex < gridRows; rowIndex++) {
        for (let colIndex = 0; colIndex < gridColumns; colIndex++) {
            let tile = gameGrid[rowIndex][colIndex];
            if (minePositions.includes(tile.id)) {
                tile.classList.remove("flagged");
                tile.innerHTML = bombIMG();
                tile.style.backgroundColor = "red";
            }
        }
    }
}

// Reveal tile and recursively expand empty areas
function checkMine(rowIndex, colIndex) {

    // Out of bounds
    if (rowIndex < 0 || rowIndex >= gridRows || colIndex < 0 || colIndex >= gridColumns) {
        return;
    }

    let tile = gameGrid[rowIndex][colIndex];

    // Already revealed
    if (tile.classList.contains("tile-clicked")) {
        return;
    }

    // Reveal tile
    tile.classList.remove("flagged");
    tile.innerHTML = "";
    tile.classList.add("tile-clicked");
    revealedTileCount++;

    // Update remaining safe tile count
    let remainingSafeTiles = (gridRows * gridColumns - totalMines) - revealedTileCount;
    document.getElementById("remaining-count").innerText = remainingSafeTiles;

    let adjacentMines = 0;

    // Count adjacent mines
    adjacentMines += checkTile(rowIndex - 1, colIndex - 1);
    adjacentMines += checkTile(rowIndex - 1, colIndex);
    adjacentMines += checkTile(rowIndex - 1, colIndex + 1);
    adjacentMines += checkTile(rowIndex, colIndex - 1);
    adjacentMines += checkTile(rowIndex, colIndex + 1);
    adjacentMines += checkTile(rowIndex + 1, colIndex - 1);
    adjacentMines += checkTile(rowIndex + 1, colIndex);
    adjacentMines += checkTile(rowIndex + 1, colIndex + 1);

    // If adjacent mines exist, show number
    if (adjacentMines > 0) {
        tile.innerText = adjacentMines;
        tile.classList.add("text" + adjacentMines);
    } else {
        // Fill reveal for empty tiles
        checkMine(rowIndex - 1, colIndex - 1);
        checkMine(rowIndex - 1, colIndex);
        checkMine(rowIndex - 1, colIndex + 1);
        checkMine(rowIndex, colIndex - 1);
        checkMine(rowIndex, colIndex + 1);
        checkMine(rowIndex + 1, colIndex - 1);
        checkMine(rowIndex + 1, colIndex);
        checkMine(rowIndex + 1, colIndex + 1);
    }

    // Win condition
    if (revealedTileCount === gridRows * gridColumns - totalMines) {
        document.getElementById("mines-count").innerText = "Cleared";
        isGameOver = true;
    }
}

/* Check Tile */
function checkTile(rowIndex, colIndex) {

    if (rowIndex < 0 || rowIndex >= gridRows || colIndex < 0 || colIndex >= gridColumns) {
        return 0;
    }

    if (minePositions.includes(`${rowIndex}-${colIndex}`)) {
        return 1;
    }

    return 0;
}
