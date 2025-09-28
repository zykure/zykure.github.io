//console.log(all_lyrics);

// Keep cookies for up to 90 days
const COOKIE_LIFETIME = 90;  

// Some emojis for result display
const SYMBOLS_CORRECT   = ['🥳', '🤩', '😎', '😄', '😆'];
const SYMBOLS_INCORRECT = ['🫢', '🫣', '🤔', '🤨', '😧', '😱'];
const SYMBOLS_GAMEOVER  = ['😵', '😵‍💫', '😖', '😭', '🤬'];

// Load songs from JSON
var songs = [];
var song_names = [];
loadSongData();

// Lyrics lines in this round (after input filter)
var uniq_lyrics = [];
var num_lyrics = 0;

// The song to guess in this round
var current_song = null;
var current_song_name = null;

// List of previously guessed songs in this round
var previous_guesses = [];
var num_guesses = 0;

// Restore highscore from cookie
var highscore = parseInt(getCookie('highscore'));
if (! highscore)
	highscore = 0;
console.log("Last highscore:", highscore);

// Restore win streak from cookie
var streak = parseInt(getCookie('streak'));
if (! streak)
	streak = 0;
console.log("Last streak:", streak);

// Load song data from file
function loadSongData() {
	songs = [];
	song_names = [];

	all_lyrics.albums.forEach((album) => {
		album.songs.forEach((song) => {
			songs.push(song);
			song_names.push(song.name);
		});
	});

	console.log("Loaded songs: ", song_names);
}

// Choose a new song for the user to guess
function chooseNewSong() {
	// Loop until new song was found
	var old_song = current_song;
	while (true) {
		// pick a song
		current_song = randomChoice(songs);
		current_song_name = current_song.name.toLowerCase();
		console.log("Set current song: ", current_song.name);

		// prevent choosing same song again
		if (current_song == old_song) {
			console.log("Same song, choosing again.");
			continue;
		}

		updateSongLyrics();

		// prevent choosing too short songs / instrumentals
		if (num_lyrics > 2)
			break;

		console.log("Not enough lines, choosing again.");
	}
	
	// reset game data
	num_guesses = 0;
	previous_guesses = [];
}

// Update song lyrics data
function updateSongLyrics() {
	// save unique set of lines
	var tmp_lyrics = new Set();
	
	current_song.lyrics.forEach((line) => {
		// strip punctuation at end of lines
		if (".,:;…?!".indexOf(line.slice(-1)) >= 0) {
			line = line.substr(0, line.length-1);  // strip off last char
		}
		tmp_lyrics.add(line);
	});
	
	uniq_lyrics = [...tmp_lyrics];
	console.log(uniq_lyrics);

	// count available lines
	num_lyrics = uniq_lyrics.length;
	console.log("Number of unique lines: ", num_lyrics);
}

// Function to choose random index from input array
function randomIndex(arr) {
	var index = Math.floor(arr.length * Math.random());
	if (index >= arr.length)
		index = arr.length - 1;
	return index;
}

// Function to choose random entry from input array
function randomChoice(arr) {
	return arr[randomIndex(arr)];
}

// Update the user prompt
function updatePrompt() {
	// pick a lyrics line
	while (true) {
		var line_index = randomIndex(uniq_lyrics);
		console.log("Choosing line no.: ", line_index);

		lyrics_line = uniq_lyrics[line_index];
		uniq_lyrics.splice(line_index, 1);  // remove line from buffer

		if (lyrics_line.length > 3)
			break;

		console.log("Line too short, choosing again.");
	}

	// show current line
	$('#lyrics-line').html("»&nbsp;" + lyrics_line + "&nbsp;«");
	$('#lyrics-line').focus();

	// Prevent users from reloading the page in order to increase their win streak.
	// While guessing, the win streak is removed. It is only saved at the end of the round with the current value.
	// We store the negative streak value so that we can later show a message if the streak was lost (does not trigger when streak was zero.)
	setCookie('streak', -1*streak, COOKIE_LIFETIME);
}

function initGame() {
	if (streak < 0) {
		resetGame();
		return;
	}
	
	// update streak/score display
	updateStreak();
	updateHighscore();
	
	// show info message
	$('#message').html("The game has not started yet.");

	// clear + disable input field
	$('#guess').val("");
	$('#guess').prop('disabled', false);
	
	// hide result text
	$('#result').hide();
	
	// hide/show buttons
	$('#submit').hide();
	$('#giveup').hide();
	$('#reset').hide();	
	$('#start').show();
}

// Start new game
function resetGame() {
	if (streak < 0) {
		// show message when a previous streak was lost (due to reloading the page)
		$('#message').html(`You lost your win streak of ${-1*streak} rounds.`)
		streak = 0;
	}
	
	// update streak/score display
	updateStreak();
	updateHighscore();

	// update prompt with new song
	chooseNewSong();
	updatePrompt();
	updateGuesses();
	
	// clear info message
	$('#message').html("");

	// clear + enable input field
	$('#guess').val("");
	$('#guess').prop('disabled', false);

	// focus hint so that TAB moves to input field
	$('#lyrics-line').focus();

	// hide result text
	$('#result').hide();

	// hide/show buttons
	$('#submit').show();
	$('#giveup').show();
	$('#reset').hide();
	$('#start').hide();
}

// Forfeit the game
function endGame() {
	showGameOver(true);
}

// Show game over message
function showGameOver(forfeit_game = false) {
	// pick a symbol
	var symbol = randomChoice(SYMBOLS_GAMEOVER);
	var guessed_text = num_guesses + " guesses";
	if (num_guesses == 1)
		guessed_text = num_guesses + " guess";
	
	html_text = `
		<span class="symbol">${symbol}</span>
		<b>GAME OVER!</b>
		<span class="symbol">${symbol}</span>
	`
	if (! forfeit_game) {
		html_text += `
			<br/>
			You've used <span id="guessed-count">${guessed_text}</span> and there are no more lyrics left.
		`
	}
	html_text += `
		<br/><br/>
		The correct answer was: <b><span id="correct-answer">${current_song.name}</span></b>
	`
	
	if (streak > 0) {
		html_text += `
			<br/>
			You lost your win streak of ${streak} rounds.
		`
	}

	streak = 0;  // game over loses current streak
	console.log("Win streak lost!");
	updateStreak();

	// show game over message
	$('#result').html(html_text);
	$('#result').show();
	
	// clear info message
	$('#message').html("");

	// disable input
	$('#guess').prop('disabled', true);

	// hide/show buttons
	$('#submit').hide();
	$('#giveup').hide();
	$('#reset').show();
}

// Show win message
function showWin() {
	// pick a symbol
	var symbol = randomChoice(SYMBOLS_CORRECT);
	var guessed_text = num_guesses + " guesses";
	if (num_guesses == 1)
		guessed_text = num_guesses + " guess";

	// calculate score
	//var score = 10. * (1. - (num_guesses - 1) / num_lyrics);
	var score = -20. * Math.log(num_guesses / num_lyrics);
	var score_text = score.toFixed(0);
	console.log("Game score: ", score);
	
	html_text = `
		<span class="symbol">${symbol}</span>
		<b>Correct!</b>
		<span class="symbol">${symbol}</span>
		<br/>
		You've used <span id="guessed-count">${guessed_text}</span> to get there.
		<br/><br/>
		You scored <span id="game-score">${score_text}</span> points!
	`

	// update win streak
	streak++;
	console.log("Win streak: ", streak);
	updateStreak();
	
	// show current streak as stars
	var streak_text = "";
	if (streak > 1)
		streak_text = '⭐'.repeat(streak)
	
	if (streak_text) {
		html_text += `
			<br/>
			Your win streak: ${streak_text}
		`
	}

	// show new highscore message
	if (! highscore || score.toFixed(0) > highscore.toFixed(0)) {
		highscore = score;
		updateHighscore();
		
		html_text += `
			<br/>
			<b>🎉 NEW HIGHSCORE! 🎉</b>
		`
	}
	
	// show win message
	$('#result').html(html_text);
	$('#result').show();

	// clear info message
	$('#message').html("");

	// disable input
	$('#guess').prop('disabled', true);

	// hide/show buttons
	$('#submit').hide();
	$('#giveup').hide();
	$('#reset').show();
}

// Show try again message
function showTryAgain() {
	// pick a symbol
	var symbol = randomChoice(SYMBOLS_INCORRECT);
	var guessed_text = num_guesses + " guesses";
	if (num_guesses == 1)
		guessed_text = num_guesses + " guess";

	html_text = `
		<span class="symbol">${symbol}</span>
		<b>Incorrect!</b>
		<span class="symbol">${symbol}</span>
		<br/>
		You've used <span id="guessed-count">${guessed_text}</span> so far.
		<br/>
		Try again?
	`

	// show message
	$('#result').html(html_text);
	$('#result').show();
}

// Update highscore
function updateHighscore() {
	if (! highscore || highscore < 0)
		highscore = 0;
	setCookie('highscore', highscore, COOKIE_LIFETIME);

	var html_text = "";
	
	if (highscore > 0) {
		var score_text = highscore.toFixed(0);
		html_text = `
			Your highscore: ${score_text}<br/>
		`
	}
	
	if (html_text) {
		$('#highscore').html(html_text);
		$('#highscore').show();
	}
	else {
		$('#highscore').hide();
	}
}

// Update streak
function updateStreak() {
	if (! streak || streak < 0)
		streak = 0;
	setCookie('streak', streak, COOKIE_LIFETIME);

	var html_text = "";
	
	if (streak > 0) {
		var streak_text = streak.toFixed(0);
		html_text = `
			Your win streak: ${streak_text}<br/>
		`
	}
	
	if (html_text) {
		$('#streak').html(html_text);
		$('#streak').show();
	}
	else {
		$('#streak').hide();
	}
}

// Update previous guesses
function updateGuesses() {
	var html_text = "";
	
	if (previous_guesses.length > 0) {
		html_text += `
			Previous guesses:<br/>
			<div>${previous_guesses.join("<br/>")}</div>
		`
	}

	if (html_text) {
		$('#tries').html(html_text);
		$('#tries').show();
	}
	else {
		$('#tries').hide();
	}
}

// Process user input
function submitGuess() {
	// get user input
	var guessed_name = $('#guess').val().trim();
	console.log("Submitted guess: ", guessed_name);
	
	if (guessed_name == "") {
		// warn on empty answer
		$('#message').html('Empty answer - try entering a song title!')
	}
	else if (previous_guesses.includes(guessed_name)) {
		// ignore repeated answers
		console.log("You already tried this song - choose again!");
		$('#message').html('Repeated answer - please try again!')
		return;
	}
	else {
		$('#message').html("");
	}

	// update game data
	if (guessed_name != "") {
		previous_guesses.splice(0, 0, guessed_name);  // insert at top
		updateGuesses();
	}

	num_guesses++;
	console.log("Current guess count: ", num_guesses);

	// process game status
	if (num_guesses >= num_lyrics || uniq_lyrics.length == 0) {
		console.log("Game over.");

		showGameOver();
	}
	else if (guessed_name.toLowerCase() != current_song_name) {
		console.log("Guessed incorrectly.");

		updatePrompt();
		showTryAgain();
	}
	else {
		console.log("Guessed correctly.");
		showWin();
	}
}

// Update info text
function updateInfo() {
	// get file modification date
	const modified_text = document.lastModified.split(" ")[0];

	$('#modified').html(modified_text);
}
