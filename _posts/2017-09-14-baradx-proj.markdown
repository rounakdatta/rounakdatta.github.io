---
layout: post
title: "BARADX : Track your Satellite"
image: baradximg.jpeg
hidden: true
visible: 0
---
The TTC Dashboard for BaradX

![BARADX](/assets/baradximg.jpeg){:class="img-responsive"}

Presently,

• Get input packets from two Arduinos

• Put the respective parameters in the corresponding fields

• Plot the latitude-longitude using the Maps API ```GMaps, OpenStreetMap, BingMaps```

• Display gauges and bars

• Watch your satellite navigate across the globe

Find the GitHub repo <a href="https://github.com/rounakdatta/baradx">here</a>.

<br>
<center>
<button id="likeButton" onclick="likeItem()"><img src="https://cdn3.iconfinder.com/data/icons/jolly-icons-free/64/thumb-up_64.png"></button>
<div id="likeCount"></div>
</center>

<script type="text/javascript">

let postTitle = "baradx"

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