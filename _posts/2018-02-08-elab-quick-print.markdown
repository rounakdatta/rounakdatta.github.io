---
layout: post
title: "eLab Report Generator"
hidden: true
visible: 0
---
Quickly get your eLab record generated

Usage instructions are documented <a href="https://github.com/rounakdatta/elab-report-maker/blob/master/README.md">here</a>.

- Doesn't matter if questions are incomplete in between

- Accepts C, C++, Java, Python as the available options for program evaluation

- Evaluates only the completed and 100% verified questions

- Collects all the evaluation reports in PNG format, converts them to PDF and concatenates all the PDFs

- Single PDF file shareable with classmates to share progress / as final eLab submission report

- Uses Python library - _requests_ (for getting the reports) and _img2pdf_ (for converting to PDF) instead of (resource heavy and difficult-to-use) Selenium.

- Response time : 10m (best case)

- Support - 2nd year ```CSE (ADA, Java)```, ```IT (ADA, Java)```, 1st year ```PDD```

![Screenshot](/assets/elab-report.png){:class="img-responsive"}

A demo version is currently live at <a href="http://elabreport.herokuapp.com">elabreport.ml</a>. Recommended to use Google Colab for the purpose. The response time isn't lightning fast because eLab servers are slow!

```
Status : Contact if you'd like to maintain this project furthur.
```

Find the GitHub repo <a href="https://github.com/rounakdatta/elab-quick-print">here</a>.

<br>
<center>
<button id="likeButton" onclick="likeItem()"><img src="https://cdn3.iconfinder.com/data/icons/jolly-icons-free/64/thumb-up_64.png"></button>
<div id="likeCount"></div>
</center>

<script type="text/javascript">

let postTitle = "elab-report"

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