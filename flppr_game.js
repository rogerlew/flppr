
let currentState = [false, false, false, false];
let targetState = [false, false, false, false];
let commandMask = [false, false, false, false];
let pid = "participant0";
let score = 0;

let gameUUID = generateUUID();
console.log("Game UUID:", gameUUID);

let worker = new Worker('timerWorker.js');

worker.addEventListener('message', function(e) {
    const data = e.data;
	
    if (data.type === 'update') {
        document.getElementById('timer').innerText = 'Trial Time Remaining: ' + data.remainingTrialTime;
        document.getElementById('game_timer').innerText = 'Time Remaining: ' + formatTime(data.remainingGameTime);
    } else if (data.type === 'end') {
        exitGame();
    }
});

function generateUUID() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

// Initialize the game
function initGame(playerName, intervalTime, gameTime) {
	
    pid = playerName;
    time_interval = intervalTime;
    game_timer = gameTime;
    timer = time_interval;
	
    targetState = randomState();
    updateDisplay(currentState, 'current-state');
    updateDisplay(targetState, 'target-state');
    updateDisplay(commandMask, 'command-mask');
	
    worker.postMessage({ 
        command: 'start', 
        time_interval: time_interval, 
        game_timer: game_timer 
    });
}

// Function to generate a random boolean array
function randomState() {
    // Inner function to generate a random boolean array
    function _randomState() {
        return Array.from({ length: 4 }, () => Math.random() > 0.5);
    }

    let state = _randomState();
    // Ensure the new state is different from the current state
    while (JSON.stringify(state) === JSON.stringify(currentState)) {
        state = _randomState();
    }

    return state;
}

// Function to update the display of a state
function updateDisplay(state, elementId) {
    const element = document.getElementById(elementId);
    element.innerHTML = '';
    state.forEach(bit => {
        const bitElement = document.createElement('span');
        bitElement.className = 'bit' + (bit ? ' on' : '');
        element.appendChild(bitElement);
    });
}

// Function to update the command mask
function updateCommand(key) {
    const index = { 'A': 0, 'S': 1, 'D': 2, 'F': 3 }[key];
    commandMask[index] = !commandMask[index];
    updateDisplay(commandMask, 'command-mask');
}

// Function to apply the command mask to the current state
function applyCommand() {
    currentState = currentState.map((bit, index) => commandMask[index] ? !bit : bit);
    updateDisplay(currentState, 'current-state');
	
    if (currentState.every((bit, index) => bit === targetState[index])) {
        score++;
        document.getElementById('score').innerText = 'Score: ' + score;
        targetState = randomState();
        updateDisplay(targetState, 'target-state');
		worker.postMessage({ command: 'new_trial' });
    } else {
        score--;
	}
	
	commandMask = [false, false, false, false];
    updateDisplay(commandMask, 'command-mask');
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function exitGame() {
    worker.postMessage({ command: 'stop' });

    document.getElementById('game-end-message').innerText = `Thank you for playing! Score: ${score}`;
    document.getElementById('game-end-popup').style.display = 'block';
}

function closePopup() {
    document.getElementById('game-end-popup').style.display = 'none';
    // Additional logic for closing the popup, such as resetting the game or navigating to another page
}

document.addEventListener('keydown', function(event) {
    switch(event.key) {
        case 'a':
        case 'A':
            updateCommand('A');
            break;
        case 's':
        case 'S':
            updateCommand('S');
            break;
        case 'd':
        case 'D':
            updateCommand('D');
            break;
        case 'f':
        case 'F':
            updateCommand('F');
            break;
        case ' ':
            applyCommand();
            break;
    }
});

document.getElementById('game-settings-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const playerName = document.getElementById('name').value;
    const intervalTime = parseInt(document.getElementById('time-interval').value, 10);
    const gameTime = parseInt(document.getElementById('game-time').value, 10);

    initGame(playerName, intervalTime, gameTime);
	const loadingScreen = document.getElementById('loading-screen');
	if (loadingScreen) {
		loadingScreen.parentNode.removeChild(loadingScreen);
	}
});