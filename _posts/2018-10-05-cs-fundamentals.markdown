---
layout: post
title: "Why CS Fundamentals matter"
hidden: true
visible: 0
---
Computer Science fundamentals typically involves the basics of how electronics work in tandem and make the software abstraction happen. Its always important to be sure enough of the internal processing of any system before diving deep into optimization research or even building industry-grade products based on the same. Of course it's not practical to keep re-inventing wheels in the process of learning science, however its pretty advisable to be confident enough of the little things and their first steps at least. All complex systems can be re-engineered from scratch provided we start with the first principles of it. The key to be better at engineering is to know the inside-out of things while being capable enough to use and debug it. This post tries to stress the importance of fundamental Computer Science courses that are often slipped out of interest probably due to their complexity of understanding amalgamated with their functionality being perfect in their respective domain.

## Computer Architecture

Computer Architecture would talk of why computers work the way they are, they give raw explanation of how CPUs exactly work, why primary memory matters, the fundamentals of data transfer between two devices. Computer System Architecture takes you to the motherboard level where you are taught to explain how CPU manages to execute series of instructions by fetching them one by one with the help of Program Counter and Instruction Register; how a single-core CPU really manages multiple threads, how processes are snapped and un-snapped by CPU using interrupts; how computers see addition and multiplication; and how external devices get their work done. These core concepts are crucial to be well-understood to build the fundamentals of microprocessing over it.

![Architecture](https://techcrunch.com/wp-content/uploads/2017/04/2017-04-05_1013.png?w=1390&crop=1)

<hr>

## Microprocessors & Microcontrollers

Microprocessors are so underrated - the fundamental piece of hardware managing the entire system effectively without downtime. The key ideas of how microprocessors store raw data quickly beside them (in registers), how each register is assigned a responsibility, how they communicate with them to perform operations, its just CPU at the finest level. Its so important for a computer science researcher to be aware of the down-lying code every single programming language is compiled/translated into. Apart from this, its mind-blowing to read about hardware and software revolutions that took us the roller-coaster ride from 8086 to Pentium to i-series to GPUs to TPUs. The transistor has been doing its task since ages, so its unwise to be confused of how a transistor works.

![Micro](https://beta.techcrunch.com/wp-content/uploads/2017/05/tpu_cityscape_forwebonly_final.jpg?w=680)

<hr>

## Operating Systems

Operating System is not only the performance-deciding factor of a system, rather it's the entire layer of software that's entitled to exploit the hardware capabilities. Its absolutely a must for Computer Science engineers to understand the internals of OS and explain how things work together in harmony. The importance of the OS on a system and being proficient enough to use it effectively is one of the must-needed skills of a CS grad. Well, one should be able to disasssemble an OS and able to reconstruct it part-by-part making no functionality broken. Reason number one why everyone should be learning and using UNIX-based OS (preferably Linux) in their learning days. Being proficient on the command line helps you being a better programmer. Not only do you understand the ins-and-outs of the existence of different files, but you do have the power to tweak performance to your requirements. Afterall, performing tasks through the command line is like using the first principles of any software development or usage. Here are some resources to get you intrigued :

* [The Design of the UNIX OS](https://github.com/suvratapte/Maurice-Bach-Notes)

* [Linux Course 1](https://linuxjourney.com/)

* [Linux Course 2](https://0xax.gitbooks.io/linux-insides/content/Booting/linux-bootstrap-1.html)

* [Low Level Bit Hacks](http://www.catonmat.net/blog/low-level-bit-hacks-you-absolutely-must-know/)

![OS](https://techcrunch.com/wp-content/uploads/2015/04/screenshot-2015-04-21-at-11-13-31.png?w=1390&crop=1)

<hr>

## Computer Networks

Its just fascinating to realize the current progress Computer Networks has achieved. [At the tip of a micro-second electrical signals are being transmitted from one pole of the Earth to another](https://github.com/alex/what-happens-when). As a Computer Science Engineer, its important to know of the fundamentals of the Internet, how devices connect with each other, [how exactly does the data fly through air](https://www.quora.com/How-do-you-explain-to-a-ten-year-old-how-information-is-passed-through-thin-air-WiFi-data-networks-3G-et-cetera), how to establish connections securely. Nevertheless, one should not miss out the concepts of how routing works effectively, who is maintaining the internet, what's the decentralized side of the internet, and how data flows through under-ocean cables. Its the research in Computer Networks (and Telecommunication) that has brought about revolutionary technologies like LTE, Fiber Broadband services to mankind. If it matters for the data to be passed on responsibly by middle-men, its important to be thorough with the concepts governing it. Here are some resources to get you intrigued :

* [Computer Networks Full Course](http://intronetworks.cs.luc.edu/current/html/intro.html)

* [CN Couse by IITK](https://www.cse.iitk.ac.in/users/dheeraj/cs425/)

* [HTTP Proxy and VPN musings at college](https://blog.harshillodhi.co.in/http-proxy-musings-2/)

* Learn how [HTTPS](https://howhttps.works/) and [DNS](https://howdns.works/) works

* [Really good introduction to XML](https://www.sitepoint.com/really-good-introduction-xml/)

* [Animated explanation of DNS over HTTPS](https://hacks.mozilla.org/2018/05/a-cartoon-intro-to-dns-over-https/)

![Networks](https://techcrunch.com/wp-content/uploads/2018/10/GettyImages-10138254182.jpg?w=1390&crop=1)

Here are more fantastic blogs, posts and writings you should definitely read if you truly aspire to be a Computer Science Engineer :

* [Shekhar Gulati's Blog](https://shekhargulati.com/)

* [Curated Reading List](https://github.com/sdmg15/Best-websites-a-programmer-should-visit)

* [Explaining Infinity to Kids](https://blog.plover.com/math/infinity-for-kids.html)

* [Ok I Give Up Blog](http://okigiveup.net/)

* [What every CS Major should know](http://matt.might.net/articles/what-cs-majors-should-know/)

* [Programmer Competency Matrix](http://sijinjoseph.com/programmer-competency-matrix/)

* [Be better at DSA](http://www.cs.cornell.edu/courses/cs2112/2015fa/lectures/index.html)

* [Notes on DS and Programming](http://cs.yale.edu/homes/aspnes/classes/223/notes.html)

* [Superb collection of Technology Books](https://goalkicker.com/)

* Learn a new Programming Language [here](https://learnxinyminutes.com/) or [here](http://hyperpolyglot.org/)

<hr>

<br>
<center>
<button id="likeButton" onclick="likeItem()"><img src="https://cdn3.iconfinder.com/data/icons/jolly-icons-free/64/thumb-up_64.png"></button>
<div id="likeCount"></div>
</center>

<script type="text/javascript">

let postTitle = "cs-fundamentals"

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