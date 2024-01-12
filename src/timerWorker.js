let interval;
let trialStartTime; // Datetime
let startTime;
let time_interval;
let game_timer;

self.addEventListener('message', function(e) {
    const data = e.data;

    switch (data.command) {
        case 'start':
            startTime = Date.now();
			trialStartTime = startTime;
            time_interval = data.time_interval;
            game_timer = data.game_timer;
            startTimer();
            break;
            break;
        case 'new_trial':
			trialStartTime = Date.now();
            break;
        case 'stop':
            stopTimer();
            break;
    }
});

function startTimer() {
    interval = setInterval(() => {
        const currentTime = Date.now();
        const elapsedTrialTime = Math.floor((currentTime - trialStartTime) / 1000);
        const remainingTrialTime = time_interval - elapsedTrialTime;
        const elapsedGameTime = Math.floor((currentTime - startTime) / 1000);
        const remainingGameTime = game_timer - elapsedGameTime;

        // Post updates back to the main thread
        self.postMessage({ 
            type: 'update', 
            remainingTrialTime: remainingTrialTime, 
            remainingGameTime: remainingGameTime 
        });

        // Check if the trial time or game time has ended
        if (remainingTrialTime <= 0) {
            // Logic for when the trial timer runs out
            // Reset trial timer
            trialStartTime = Date.now(); 
        }

        if (remainingGameTime <= 0) {
            // Logic for when the game timer runs out
            stopTimer();
            self.postMessage({ type: 'end' });
        }
    }, 1000);
}


function stopTimer() {
    clearInterval(interval);
}
