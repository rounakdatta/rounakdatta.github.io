---
layout: post
title: "Decentralized lottery"
hidden: true
visible: 0
---
This is an assignment for the application to **QuillHash** for their Blockchain Developer Internship for summer 2018.

#### Local usage

```git clone https://github.com/rounakdatta/eth-lottery.git```

```testrpc``` (on a separate terminal)

```truffle compile```

```truffle migrate```

#### On [Remix IDE](https://remix.ethereum.org/)

### Smart Contract

- ```Lottery()``` constuctor accepts the winning number from the Owner and stores it as SHA3 hash (used in Solidity as ```keccak256(payload)```).
- ```requestToken()``` can be called by participants of the lottery to request any amount of tokens (total 1000000 tokens available). Here, 1 token costs 1 ether and in case of fractional payment, the excess is refunded.
- ```makeGuess()``` can be called by participants to guess a number and spend a token. There's the security of refund in case the number is out of range.
- ```closeGame()``` can be called by the Owner to stop the lottery and find out the winner by matching the hash.
- ```winnerAddress()``` will fetch the address of the winning user.
- ```getPrice()``` can be called by the winner to receive 50% of the total ether in the contract in his / her account and transferring the remaining 50% to the Owner address.
- <b>No winner</b> : The entire amount of ethers present in the smart contract is transferred to the Owner.

### Issues

- In case multiple users guess the winning number, the last one to guess will be declared the winner.
- The user won't be able to request tokens once the 1000000 tokens are exhausted.

Find the GitHub repo [here](https://github.com/rounakdatta/eth-lottery).

<br>
<center>
<button id="likeButton" onclick="likeItem()"><img src="https://cdn3.iconfinder.com/data/icons/jolly-icons-free/64/thumb-up_64.png"></button>
<div id="likeCount"></div>
</center>

<script type="text/javascript">

let postTitle = "eth-lottery"

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