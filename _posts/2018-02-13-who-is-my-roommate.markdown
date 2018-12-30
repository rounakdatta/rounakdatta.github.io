---
layout: post
title: "Who is my Roommate"
hidden: true
visible: 0
---
Our University admits a large troop of students for undergraduation. And so the hostel booking process becomes difficult (when servers add to the crowd problem). But that's totally out of our hands. What this tiny tool could do is host the entire student hostel database when the correct data is inputted by the crowd _after hostel booking is over_.

The site is currently live at <a href="http://hostelroo.ml/">hostelroo.ml</a>.

<center><h3>--- 2018 Edition ---</h3>
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

_Hosted freely on **PythonAnywhere**_.

Find the source code for the 2018 edition <a href="https://github.com/rounakdatta/who-is-my-roommate/tree/flask-mysql">here</a>.

<br><br>

<center><h3>--- 2019 Edition ---</h3>
<i>Built on Node.js and powered by Firebase Realtime Database</i>
</center>
<br>

<div id="myCarousel" class="carousel slide" data-ride="carousel">
  <ol class="carousel-indicators">
    <li data-target="#myCarousel" data-slide-to="0" class="active"></li>
    <li data-target="#myCarousel" data-slide-to="1"></li>
    <li data-target="#myCarousel" data-slide-to="2"></li>
  </ol>

  <div class="carousel-inner">
    <div class="item active">
      <img src="/assets/hostelroo_main.png" alt="Home Page">
    </div>

    <div class="item">
      <img src="/assets/hostelroo_search.png" alt="Search Results">
    </div>

    <div class="item">
      <img src="/assets/hostelroo_details.png" alt="Student Details">
    </div>
  </div>

  <a class="left carousel-control" href="#myCarousel" data-slide="prev">
    <span class="glyphicon glyphicon-chevron-left"></span>
    <span class="sr-only">Previous</span>
  </a>
  <a class="right carousel-control" href="#myCarousel" data-slide="next">
    <span class="glyphicon glyphicon-chevron-right"></span>
    <span class="sr-only">Next</span>
  </a>
</div>

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