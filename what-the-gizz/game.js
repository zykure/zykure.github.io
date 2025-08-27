console.log(all_lyrics);

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

function loadSongData() {
	songs = [];
	all_lyrics.albums.forEach((album) => {
		album.songs.forEach((song) => {
			songs.push(song);
			song_names.push(song.name);
		});
	});
	
	song_names.sort();
	console.log("Loaded songs: ", song_names);
}

function chooseNewSong() {
	while (true) {
		current_song = randomChoice(songs);
		current_song_name = current_song.name.toLowerCase();
		console.log("Set current song: ", current_song.name);
		
		updateSongLyrics();
		
		if (num_lyrics > 2)  // require at least 2 lines of lyrics
			break;
			
		console.log("Not enough lines, choosing new song.");
	}

	num_guesses = 0;
	previous_guesses = [];
}

function updateSongLyrics() {
	uniq_lyrics = [...new Set(current_song.lyrics)];
	num_lyrics = uniq_lyrics.length;
	console.log("Number of unique lines: ", num_lyrics);
}

// Function to choose random entry from input array
function randomIndex(arr) {
	var index = Math.floor(arr.length * Math.random());
	if (index >= arr.length)
		index = arr.length - 1;
	return index;
}

function randomChoice(arr) {
	return arr[randomIndex(arr)];
}

// Update the user prompt
function updatePrompt() {
	var line_index = randomIndex(uniq_lyrics);		
	console.log("Choosing line no.: ", line_index);
	
	lyrics_line = uniq_lyrics[line_index];
	uniq_lyrics.splice(line_index, 1);  // remove line

	$('#lyrics-line').html("»&nbsp;" + lyrics_line + "&nbsp;«");

	//$('#guess').val("");
	//$('#guess').focus();
}

function resetGame() {
	chooseNewSong();
	updatePrompt();
	updateGuesses();
	
	$('#guess').val("");

	$('#result').hide();
	
	$('#submit').prop('disabled', false);
	$('#giveup').prop('disabled', false);
	$('#reset').prop('disabled', false);
	$('#guess').prop('disabled', false);
}

function endGame() {
	showGameOver(true);
}

function showGameOver(forfeit = false) {		
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

	$('#result').html(html_text);
	$('#result').show();
	
	$('#submit').prop('disabled', true);
	$('#giveup').prop('disabled', true);
	$('#guess').prop('disabled', true);
}

function showWin() {
	var symbol = randomChoice(symbols_correct);
	var guessed_text = num_guesses + " guesses";
	if (num_guesses == 1)
		guessed_text = num_guesses + " guess";	
	
	// score is inverse ratio between number of (wrong) guesses to number of lyrics lines
	//var score = 10. * (1. - (num_guesses - 1) / num_lyrics);
	var score = -20. * Math.log(num_guesses / num_lyrics);
	console.log("Game score: ", score);
	var score_text = score.toFixed(0);

	html_text = `
		<span class="symbol">${symbol}</span>
		<b>Correct!</b>
		<span class="symbol">${symbol}</span>
		<br/>
		You've used <span id="guessed-count">${guessed_text}</span> to get there.
		<br/><br/>
		You scored <span id="game-score">${score_text}</span> points!
	`
	$('#result').html(html_text);
	$('#result').show();

	$('#submit').prop('disabled', true);
	$('#giveup').prop('disabled', true);
	$('#guess').prop('disabled', true);
}

function showTryAgain() {
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
	$('#result').html(html_text);
	$('#result').show();
}

function updateGuesses() {
	if (previous_guesses.length > 0) {
		$('#tries').html(`
			Previous guesses: <div>${previous_guesses.join("<br/>")}</div>
		`);
		$('#tries').show();
	}
	else {
		$('#tries').hide();
	}
}

// Process user input
function submitGuess() {
	var guessed_name = $('#guess').val().trim();
	var guessed_correctly = false;
	var game_over = false;
	
	console.log("Submitted guess: ", guessed_name);
	if (guessed_name == "" || previous_guesses.includes(guessed_name)) {
		console.log("Answer is empty/repeated - try again!");
		$('#message').html('Empty or repeated answer - try again!')
		return;
	}
	
	$('#message').html("");
	
	previous_guesses.splice(0, 0, guessed_name);  // insert at top
	updateGuesses();
	
	num_guesses++;
	console.log("Current guess count: ", num_guesses);

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

function updateInfo() {
	const modified_date = document.lastModified.split(" ")[0];
	$('#modified').html(modified_date);
}
