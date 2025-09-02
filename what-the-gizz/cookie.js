function setCookie(key, value, expiryDays) {
	var expires = new Date();
	expires.setTime(expires.getTime() + (expiryDays * 24 * 60 * 60 * 1000));
	document.cookie = encodeURIComponent(key) + '=' + encodeURIComponent(value) + 
					  ';expires=' + expires.toUTCString() + 
					  ';path=/'; // Adding path ensures cookie is available site-wide
}

function getCookie(key) {
	var cookies = document.cookie.split('; ');
	for (var i = 0; i < cookies.length; i++) {
		var parts = cookies[i].split('=');
		if (decodeURIComponent(parts[0]) === key) {
			return decodeURIComponent(parts[1]);
		}
	}
	return null;
}

function eraseCookie(key) {
	document.cookie = encodeURIComponent(key) + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
}
