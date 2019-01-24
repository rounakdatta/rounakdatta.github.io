---
layout: post
title: "Who is my Roommate"
hidden: true
visible: 0
---
Our University admits a large troop of students for undergraduation. And so the hostel booking process becomes difficult (when servers add to the crowd problem). But that's totally out of our hands. What this tiny tool could do is host the entire student hostel database when the correct data is inputted by the crowd _after hostel booking is over_.

The site is currently live at <a href="http://hostelroo.ml/">hostelroo.ml</a>.

<center><button class="btn btn-outline-success btn-lg">2018</button><br><br>
<i>Built on Flask and powered by MySQL database</i>
</center>
<br>

![Screenshot](/assets/who-roommate.png){:class="img-responsive"}

- Know your future roommate
- Quickly reach out to a friend's room
- Make the hostels database more open
- Request a roommate swap

_Got over 500 registrations and 15k views in a couple of days_.

_Made in an evening just for fun and mass convenience_.

_Hosted freely on **<a href="https://www.pythonanywhere.com/">PythonAnywhere</a>**_.

Find the source code for the 2018 edition <a href="https://github.com/rounakdatta/who-is-my-roommate/tree/flask-mysql">here</a>.

<br><br>

<center><button class="btn btn-outline-success btn-lg">2019</button><br><br>
<i>Built on Node.js and powered by Firebase Realtime Database</i>
</center>
<br>

![Screenshot](/assets/wimr.png){:class="img-responsive"}

- Know your future roommate
- Search for a friend (using any parameters!)
- Request a roommate swap
- Better control over your data

_Hosted freely on **<a href="https://repl.it">repl.it</a>**_.

<br>
Find the source code for the 2019 edition <a href="https://github.com/rounakdatta/who-is-my-roommate/">here</a>.

<br>
<center>
<button id="likeButton" onclick="likeItem()"><img src="https://cdn3.iconfinder.com/data/icons/jolly-icons-free/64/thumb-up_64.png"></button>
<div id="likeCount"></div>
</center>

<script type="text/javascript">

let postTitle = "hostelbooking2018"

let myLocation = "";

function getLocationDetails() {
$.get("https://json.geoiplookup.io/", function (response) {
    myLocation = response;
});
}

function likeItem() {
  getLocationDetails();

  setTimeout(function(){

  var xhr = new XMLHttpRequest();
  xhr.withCredentials = false;
  
  xhr.addEventListener("readystatechange", function () {
    if (this.readyState === 4) {
      console.log(this.responseText);
      showLikes();
    }
  });
  
  xhr.open("POST", "https://rounakdatta.pythonanywhere.com/like/post/" + postTitle);
  xhr.setRequestHeader("content-type", "application/json");
  xhr.setRequestHeader('Access-Control-Allow-Origin', '*')
  xhr.setRequestHeader("Access-Control-Allow-Credentials", true);
  xhr.setRequestHeader("cache-control", "no-cache");
  xhr.setRequestHeader("postman-token", "6b90fa48-bca5-8464-df36-a229e6b15f2a");
  
  console.log(JSON.stringify(myLocation));
  xhr.send(JSON.stringify(myLocation));

  }, 1000);
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