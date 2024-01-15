import { logKeyPress, 
    logScoreUpdate, 
    logTrialReset, 
    logGameStart, 
    logGameStop, 
    logExecute,
    addHighScore } from './firestore_db.js';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBGh3iTmoiYh2jhbYyyg9G9z_3DpNqidQw",
    authDomain: "flppr-a270b.firebaseapp.com",
    projectId: "flppr-a270b",
    storageBucket: "flppr-a270b.appspot.com",
    messagingSenderId: "203747411489",
    appId: "1:203747411489:web:4991fd457ee707e0a1c560"
    };

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

auth.signInAnonymously()
  .then(() => {
    console.log("Signed in anonymously");
  })
  .catch((error) => {
    const errorCode = error.code;
    const errorMessage = error.message;
    console.log("Error signing in anonymously:", errorCode, errorMessage);
  });

let currentState = [false, false, false, false];
let targetState = [false, false, false, false];
let commandMask = [false, false, false, false];
let player_id = "participant0";
let time_interval = -1;
let game_interval = -1

let k = 0; // trial counter
let score = 0;

let gameUUID = generateUUID();
console.log("Game UUID:", gameUUID);

let worker = new Worker('timerWorker.js');

worker.addEventListener('message', function(e) {
    const data = e.data;
	
    if (data.type === 'update') {
        document.getElementById('timer').innerText = 'Trial Time Remaining: ' + data.remainingTrialTime;
        document.getElementById('game_timer').innerText = 'Time Remaining: ' + formatTime(data.remainingGameTime);
    } 
    else if (data.type == 'trialTimeOut') {
        targetState = randomState();
        updateDisplay(targetState, 'target-state');

        score--;
	    logScoreUpdate(db, gameUUID, k, score);
    } 
    else if (data.type === 'end') {
        exitGame();
    }
});

function generateUUID() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

// Initialize the game
function initGame(playerName, new_time_interval, new_game_interval) {
	player_id = playerName;
    time_interval = new_time_interval; 
    game_interval = new_game_interval;
	
    targetState = randomState();
    updateDisplay(currentState, 'current-state');
    updateDisplay(targetState, 'target-state');
    updateDisplay(commandMask, 'command-mask');
	
    worker.postMessage({ 
        command: 'start', 
        time_interval: time_interval, 
        game_interval: game_interval 
    });

    logGameStart(db, gameUUID, player_id, time_interval, game_interval);

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

    k += 1;
    logTrialReset(db, gameUUID, k, currentState, targetState)
    return state;
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
        logExecute(db, gameUUID, k, currentState, targetState, 1);

        targetState = randomState();
        updateDisplay(targetState, 'target-state');
		worker.postMessage({ command: 'new_trial' });
    } else {
        score--;
        logExecute(db, gameUUID, k, currentState, targetState, 0);
	}

    document.getElementById('score').innerText = 'Score: ' + score;
    
    logScoreUpdate(db, gameUUID, k, score);
	
	commandMask = [false, false, false, false];
    updateDisplay(commandMask, 'command-mask');
}

function exitGame() {
    logGameStop(db, gameUUID);
    addHighScore(db, gameUUID, player_id, score, time_interval, game_interval);

    worker.postMessage({ command: 'stop' });
    document.getElementById('game-end-message').innerText = `Thank you for playing! Score: ${score}`;
    document.getElementById('game-end-popup').style.display = 'block';
}

// View

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function closePopup() {
    document.getElementById('game-end-popup').style.display = 'none';
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


// UI Handlers

document.addEventListener('keydown', function(event) {
    let index = -1
    switch(event.key) {
        case 'a':
        case 'A':
            updateCommand('A');
            index = 0;
            break;
        case 's':
        case 'S':
            updateCommand('S');
            index = 1;
            break;
        case 'd':
        case 'D':
            updateCommand('D');
            index = 2;
            break;
        case 'f':
        case 'F':
            updateCommand('F');
            index = 3;
            break;
        case ' ':
            applyCommand();
            break;
    }

    if (index > 0) {
        logKeyPress(db, gameUUID, k, index, currentState, targetState);
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
