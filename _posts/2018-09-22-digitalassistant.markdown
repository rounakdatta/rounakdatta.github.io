---
layout: post
title: "Digital Assistant - Automation to power E-Commerce"
hidden: true
visible: 0
---

How impressive was <a href="https://ai.googleblog.com/2018/05/duplex-ai-system-for-natural-conversation.html">Google Duplex</a>? Google Duplex can help you manage your daily routines by subsituting your monotonous actions with AI. Right from booking appointments to ordering goods, Google Duplex promises to handle them all.

<b>What's this Digital Assistant?</b>

Digital Assistant aims to be the replacement for your conventional store managers. Whether its the task of enquiring for avaailable products, natural conversation regarding an item, bargaining for the price of a product, ordering the product, cancellation and grievance addressal or just simply chatting around, Digital Assistant aims to be your ultimate philosopher, friend and guide solution.

<b>Where is it?</b>

Digital Assistant is now open-source, view it at [GitHub](https://github.com/rounakdatta/digital-assistant)!

<br>
![Digital Assistant Demo](https://i.imgur.com/ykkW85s.png){:class="img-responsive"}

<b>What next?</b>

Something big

<br>
<center>
<button id="likeButton" onclick="likeItem()"><img src="https://cdn3.iconfinder.com/data/icons/jolly-icons-free/64/thumb-up_64.png"></button>
<div id="likeCount"></div>
</center>

<script type="text/javascript">

let postTitle = "digital-assistant"

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