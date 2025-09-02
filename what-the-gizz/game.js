//console.log(all_lyrics);

// Some emojis for result display
const symbols_correct   = ['🥳', '🤩', '😎', '😄', '😆'];
const symbols_incorrect = ['🫢', '🫣', '🤔', '🤨', '😧', '😱'];
const symbols_gameover  = ['😵', '😵‍💫', '😖', '😭', '🤬'];

// Load songs from JSON
var songs = [];
var song_names = [];
loadSongData();

// Setup internal variables
var current_song = null;
var current_song_name = null;

var uniq_lyrics = [];
var num_lyrics = 0;

var previous_guesses = [];

// Restore last guess count
var num_guesses = 0;

var highscore = parseInt(getCookie('highscore'));
if (!highscore)
	highscore = 0;
console.log("Last highscore:", highscore);

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
	uniq_lyrics = [...new Set(current_song.lyrics)];

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

	//$('#guess').val("");
}

// Start new game
function resetGame() {
	chooseNewSong();
	updatePrompt();
	updateGuesses();
	updateHighscore();
	
	// clear input field
	$('#guess').val("");

	$('#lyrics-line').focus();

	$('#result').hide();
	$('#guess').prop('disabled', false);
	$('#submit').prop('disabled', false);
	$('#giveup').prop('disabled', false);
	$('#reset').prop('disabled', false);
}

// Forfeit the game
function endGame() {
	showGameOver(true);
}

// Show game over message
function showGameOver(forfeit = false) {
	// pick a symbol
	var symbol = randomChoice(symbols_gameover);
	var guessed_text = num_guesses + " guesses";
	if (num_guesses == 1)
		guessed_text = num_guesses + " guess";

	html_text = `
		<span class="symbol">${symbol}</span>
		<b>GAME OVER!</b>
		<span class="symbol">${symbol}</span>
	`
	if (! forfeit) {
		html_text += `
			<br/>
			You've used <span id="guessed-count">${guessed_text}</span> and there are no more lyrics left.
		`
	}
	html_text += `
		<br/><br/>
		The correct answer was: <b><span id="correct-answer">${current_song.name}</span></b>
	`

	// show message
	$('#result').html(html_text);
	$('#result').show();

	$('#submit').prop('disabled', true);
	$('#giveup').prop('disabled', true);
	$('#guess').prop('disabled', true);
}

// Show win message
function showWin() {
	// pick a symbol
	var symbol = randomChoice(symbols_correct);
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

	if (!highscore || score.toFixed(0) > highscore.toFixed(0)) {
		highscore = score;
		setCookie('highscore', highscore, 90);  // save for 90 days

		html_text += `
			<br/>
			<b>🎉 NEW HIGHSCORE! 🎉</b>
		`
		
		updateHighscore();
	}

	// show message
	$('#result').html(html_text);
	$('#result').show();

	$('#submit').prop('disabled', true);
	$('#giveup').prop('disabled', true);
	$('#guess').prop('disabled', true);
}

// Show try again message
function showTryAgain() {
	// pick a symbol
	var symbol = randomChoice(symbols_incorrect);
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

	// ignore empty or repeated answers
	if (guessed_name != "" && previous_guesses.includes(guessed_name)) {
		console.log("You already tried this song - choose again!");
		$('#message').html('Repeated answer - try again!')
		return;
	}

	$('#message').html("");

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
