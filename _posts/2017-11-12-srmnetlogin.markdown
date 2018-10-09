---
layout: post
title: "SRM Network Login"
image: srmnetlogin.png
hidden: true
visible: 0
---
*SRM University Unofficial Network Login Android Application*

![Screenshot](/assets/srmnetlogin.png){:class="img-responsive"}

This is a lightning fast network login application made using **Tasker**, ~~not Android Studio~~.

This relies on sending an HTTP request directly rather than through the browser.

The original script written by @thewisenerd can be found <a href="https://github.com/thewisenerd/check.point.automaton">here</a>. This script is packaged and modded into this present application.

**v1** : using qPython; and the UI wasn't intuitive.

**v2** : using Termux (with silent script execution)

_Deps_ : (python, pip-requests, pip-rsa) on Termux, Termux:Task

Find the GitHub repo <a href="https://github.com/rounakdatta/tasker-ed">here</a>.

*SRM University Unofficial Network Login Desktop Application*

![Screenshot](/assets/srmnetloginlinux.png){:class="img-responsive"}

This is another lightning fast network login application made for Desktop OSs (Linux / macOS / Windows) using QtPython.

Same <a href="https://github.com/thewisenerd/check.point.automaton">login script</a> was used.

Find the GitHub repo <a href="https://github.com/rounakdatta/network-login">here</a>.

<br>
<center>
<button id="likeButton" onclick="likeItem()"><img src="https://cdn3.iconfinder.com/data/icons/jolly-icons-free/64/thumb-up_64.png"></button>
<div id="likeCount"></div>
</center>

<script type="text/javascript">

let postTitle = "srmnetlogin"

let myLocation = "";

function getLocationDetails() {
	var data = null;
	
	var xhr = new XMLHttpRequest();
	xhr.withCredentials = true;
	
	xhr.addEventListener("readystatechange", function () {
	  if (this.readyState === 4) {
	    console.log(this.responseText);
	    myLocation = this.responseText;
	    console.log('--')
	  }
	});
	
	xhr.open("GET", "https://json.geoiplookup.io/");
	xhr.setRequestHeader('Access-Control-Allow-Origin', '*')
	xhr.setRequestHeader("Access-Control-Allow-Credentials", true);
	xhr.setRequestHeader("cache-control", "no-cache");
	xhr.setRequestHeader("postman-token", "e18cbd49-69f0-f0cb-297d-721bf3b97d78");
	
	xhr.send(data);
}

function likeItem() {
	getLocationDetails();
	var data = myLocation;
	
	var xhr = new XMLHttpRequest();
	xhr.withCredentials = false;
	
	xhr.addEventListener("readystatechange", function () {
	  if (this.readyState === 4) {
	    console.log(this.responseText);
	    showLikes();
	  }
	});
	
	xhr.open("POST", "https://rounakdatta.pythonanywhere.com/like/post/" + postTitle);
	xhr.setRequestHeader('Access-Control-Allow-Origin', '*')
	xhr.setRequestHeader("Access-Control-Allow-Credentials", true);
	xhr.setRequestHeader("cache-control", "no-cache");
	xhr.setRequestHeader("postman-token", "6b90fa48-bca5-8464-df36-a229e6b15f2a");
	
	xhr.send(data);
}

function showLikes() {

	var data = null;
	
	var xhr = new XMLHttpRequest();
	xhr.withCredentials = false;
	
	xhr.addEventListener("readystatechange", function () {
	  if (this.readyState === 4) {
	    console.log(this.responseText);
	    //alert(this.responseText);
	    document.getElementById('likeCount').innerHTML = "<h4>" + String(this.responseText) + "</h4>";
	  }
	});
	
	xhr.open("GET", "https://rounakdatta.pythonanywhere.com/like/post/" + postTitle);
	xhr.setRequestHeader("cache-control", "no-cache");
	xhr.setRequestHeader('Access-Control-Allow-Origin', '*')
	xhr.setRequestHeader("Access-Control-Allow-Credentials", true);
	xhr.setRequestHeader("postman-token", "5e82f0d5-65e0-a89a-729b-10c6f90fffb9");
	
	xhr.send(data);

}

</script>

<script>
$( document ).ready(function() {
    showLikes();
});
</script>

