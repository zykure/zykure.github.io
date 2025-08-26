console.log(all_lyrics);

// Some emojis for result display
const symbols_correct   = ['🥳', '🤩', '☺', '😃', '😄', '😆'];
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

// Restore last guess count
var guessed_count = 0;

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
		
		if (num_lyrics > 3)
			break;
			
		console.log("Not enough lines, choosing new song.");
	}

	guessed_count = 0;
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
	//$('#guessed-name').val("");
}

function resetGame() {
	chooseNewSong();
	updatePrompt();
	
	$('#guessed-name').val("");

	$('#result-correct').hide();
	$('#result-incorrect').hide();
	$('#result-gameover').hide();
	$('#submit').prop('disabled', false);
}

// Process user input
function submitGuess() {
	var guessed_name = $('#guessed-name').val().trim().toLowerCase();
	var guessed_correctly = false;
	var game_over = false;
	
	console.log("Submitted guess: ", guessed_name);
	if (guessed_name == "") {
		console.log("Answer is empty - try again!");
		return;
	}
	else if (guessed_name != current_song_name) {
		guessed_correctly = false;
		console.log("Guessed incorrectly.");
		
		updatePrompt();
	}
	else {
		guessed_correctly = true;
		console.log("Guessed correctly.");
	}

	guessed_count++;
	console.log("Current guess count: ", guessed_count);

	if (guessed_count >= num_lyrics || uniq_lyrics.length == 0)
		game_over = true;
	
	var guessed_text = guessed_count + " guesses";
	if (guessed_count == 1) {
		guessed_text = guessed_count + " guess";
	}
	
	if (game_over) {
		var symbol = randomChoice(symbols_gameover);
		$('#symbol-gameover-1').html(symbol);
		$('#symbol-gameover-2').html(symbol);
		$('#guessed-count-gameover').html(guessed_text);				
		$('#correct-answer').html(current_song.name);
		$('#result-correct').hide();
		$('#result-incorrect').hide();
		$('#result-gameover').show();
		$('#submit').prop('disabled', true);
	}
	else if (guessed_correctly) {
		var symbol = randomChoice(symbols_correct);
		$('#symbol-correct-1').html(symbol);
		$('#symbol-correct-2').html(symbol);
		$('#guessed-count-correct').html(guessed_text);				
		$('#result-correct').show();
		$('#result-incorrect').hide();
		$('#result-gameover').hide();
		$('#submit').prop('disabled', true);
	}
	else {
		var symbol = randomChoice(symbols_incorrect);
		$('#symbol-incorrect-1').html(symbol);
		$('#symbol-incorrect-2').html(symbol);
		$('#guessed-count-incorrect').html(guessed_text);				
		$('#result-incorrect').show();
		$('#result-correct').hide();
		$('#result-gameover').hide();
		$('#submit').prop('disabled', false);
	}
}
