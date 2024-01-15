
function StateToInt(state) {
    return state.reduce((acc, val, index) => acc + (val ? 1 << (state.length - 1 - index) : 0), 0);
}

function intToState(num, length) {
    let state = [];
    for (let i = length - 1; i >= 0; i--) {
        state.push((num & (1 << i)) !== 0);
    }
    return state;
}

export function logKeyPress(db, gameUUID, k, index, currentState, targetState) {
    const event = {
        eventType: 'keypress',
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        details: { 
            k: k, 
            index: index,  
            currentState: StateToInt(currentState), 
            targetState: StateToInt(targetState),
            error: currentState[index] == targetState[index] ? 0 : currentState[index] > 0 ? 1 : -1
        }
    };
    addEventToFirestore(db, gameUUID, event);
}

export function logExecute(db, gameUUID, k, currentState, targetState, hit) {
    const event = {
        eventType: 'execute',
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        details: { 
            k: k, 
            currentState: StateToInt(currentState), 
            targetState: StateToInt(targetState),
            hit: hit
        }
    };
    addEventToFirestore(db, gameUUID, event);
}

export function logScoreUpdate(db, gameUUID, k, newScore) {
    const event = {
        eventType: 'score',
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        details: { k: k, score: newScore }
    };
    addEventToFirestore(db, gameUUID, event);
}

export function logTrialReset(db, gameUUID, k, currentState, targetState) {
    const event = {
        eventType: 'trialReset',
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        details: {k: k, currentState: currentState, targetState: targetState}
    };
    addEventToFirestore(db, gameUUID, event);
}

export function logGameStart(db, gameUUID, player_id, time_interval, game_interval) {
    
    db.collection("Games").doc(gameUUID).set({
        startTime: firebase.firestore.FieldValue.serverTimestamp(),
        playerId: player_id,
        // any other game start details
    })
    .then(() => {
        console.log("New game session started with UUID:", gameUUID);
        const event = {
            eventType: 'gameStart',
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            details: {
                player_id: player_id,
                time_interval: time_interval, 
                game_interval: game_interval
            }
        };
        addEventToFirestore(db, gameUUID, event);
    })
    .catch((error) => console.error("Error starting new game session:", error));
    
}

export function logGameStop(db, gameUUID) {
    const event = {
        eventType: 'gameStop',
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        details: {}
    };
    addEventToFirestore(db, gameUUID, event);

    db.collection("Games").doc(gameUUID).update({
        endTime: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        console.log("Game session ended for UUID:", gameUUID);
    })
    .catch((error) => console.error("Error ending game session:", error));
    
}

function addEventToFirestore(db, gameUUID, event) {
    db.collection("Games").doc(gameUUID).collection("Events").add(event)
//        .then(() => console.log("Event logged:", event))
        .catch((error) => console.error("Error logging event:", error));
}

export function addHighScore(db, gameUUID, player_id, score, time_interval, game_interval) {
    const highScore = {
        player_id: player_id,
        gameUUID: gameUUID,
        score: score,
        time_interval: time_interval,
        game_interval: game_interval,
        timestamp: firebase.firestore.FieldValue.serverTimestamp() // for ordering
    };

    console.log(highScore)

    db.collection("HighScores").add(highScore)
        .then(() => console.log("High score added:", highScore))
        .catch((error) => console.error("Error adding high score:", error));
}

