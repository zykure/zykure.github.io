function autocomplete(inp, arr) {
	var currentFocus;
	
	console.log(arr);

	inp.addEventListener('focus', function (e) {
		showLists(e.target);
		inp.select();
	});
	
	inp.addEventListener("input", function (e) {
		showLists(e.target);
	});

	inp.addEventListener("keydown", function(e) {
		var x = document.getElementById(this.id + "autocomplete-list");
		if (x) x = x.getElementsByTagName("div");
		if (e.keyCode == 40) { // down
			currentFocus++;
			addActive(x);
		} else if (e.keyCode == 38) { // up
			currentFocus--;
			addActive(x);
		} else if (e.keyCode == 13) { // enter
			e.preventDefault();
			if (currentFocus > -1) {
				if (x) x[currentFocus].click();
			}
		}
	});
	
	function showLists (elmnt) {
		var a, b, i, val = elmnt.value;
		closeAllLists();
		if (!val) { return false;}
		currentFocus = -1;

		a = document.createElement("DIV");
		a.setAttribute("id", elmnt.id + "autocomplete-list");
		a.setAttribute("class", "autocomplete-items");
		elmnt.parentNode.appendChild(a);

		for (i = 0; i < arr.length; i++) {
			/*
			if (arr[i].substr(0, val.length).toUpperCase() == val.toUpperCase()) {
				b = document.createElement("DIV");
				b.innerHTML = "<strong>" + arr[i].substr(0, val.length) + "</strong>";
				b.innerHTML += arr[i].substr(val.length);
				b.innerHTML += "<input type='hidden' value='" + arr[i] + "'>";

				b.addEventListener("click", function(e) {
					inp.value = elmnt.getElementsByTagName("input")[0].value;
					closeAllLists();
				});
				a.appendChild(b);
			}
			*/
			var p = arr[i].toUpperCase().search(val.toUpperCase());
			if (p >= 0) {
				b = document.createElement("DIV");
				b.innerHTML = arr[i].substr(0, p);
				b.innerHTML += "<strong>" + arr[i].substr(p, val.length) + "</strong>";
				b.innerHTML += arr[i].substr(p + val.length);
				b.innerHTML += "<input type='hidden' value='" + arr[i] + "'>";

				b.addEventListener("click", function(e) {
					inp.value = this.getElementsByTagName("input")[0].value;
					closeAllLists();
				});
				a.appendChild(b);
			}
		}
	}
	
	function addActive(x) {
		if (!x) return false;
		
		removeActive(x);
		if (currentFocus >= x.length) currentFocus = 0;
		if (currentFocus < 0) currentFocus = (x.length - 1);
		x[currentFocus].classList.add("autocomplete-active");
	}
	
	function removeActive(x) {
		for (var i = 0; i < x.length; i++) {
			x[i].classList.remove("autocomplete-active");
		}
	}
	
	function closeAllLists(elmnt) {
		var x = document.getElementsByClassName("autocomplete-items");
		for (var i = 0; i < x.length; i++) {
			if (elmnt != x[i] && elmnt != inp) {
				x[i].parentNode.removeChild(x[i]);
			}
		}
	}

	document.addEventListener("click", function (e) {
		closeAllLists(e.target);
	});
}
