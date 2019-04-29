---
layout: post
title: "Product engineering over free infrastructure"
hidden: true
visible: 0
---

Well, lets first thank the internet to be generous enough 🙏!

With so many services around the internet providing with free tier of their products, credit cards are no more a hurdle. You could get started with your Node.js, Python, Go, Ruby, PHP, Elixir or any other programming language-based web-server practically free for testing as well as small-scale purposes. However, it must be noted that you must limit yourself with the server-side security-testing and other activities since containers, self-hosted programs might not be well-supported in this approach. So diving deep into the cloud providers, let introduce them one-by-one:

<h1><a href="https://repl.it">repl.it</a></h1>
We are starting with the most generous cloud services provider of the internet. REPL was built initially to provide a uniquely convenient online IDE which had good support for programming languages to file management. Eventually, supports for web-servers, multi-person sharing etc were added and this platform easily became the favourite of thousands of developers. REPL provides free users with free hosting for Express (Node.js), Django, Flask (Python), Go, Ruby, PHP at a breeze. Installing dependencies (packages, or whatever you call it) are a cakewalk by the press of a button. REPL is so generous that it doesn't even have a limit on the number of web-servers you can spin up. Literally each web-server is a dedicated container with enough-for-free scalability. You can connect databases, service APIs and get your product from localhost to production in an hour. However, repls sleep when they are inactive (no incoming requests) for over 30 mins. There are tiny hacks implemented to get around these.

<h1><a href="https://pythonanywhere.com">PythonAnywhere</a></h1>
PythonAnywhere is my second favourite when it comes to hosting Python-based (Flask / Django) applications. And servers hosted on PythonAnywhere literally power multiple of my public services (including the Like button you see at the bottom). Unlike REPL, PythonAnywhere servers do not die out (or sleep) frequently and are quite reliable. However, the owner must duly re-charge (of course free) it every 3 months.

<h1><a href="https://gigalixir.com/">GigaElixir</a></h1>
GigaElixir is another service built to help Elixir developers get their Phoenix applications to the cloud. Phoenix applications are quite fast, responsive and scalable, and could be well hosted for free on GigaElixir. To note, GigaElixir uses GCP / AWS / Heroku as the back-end.

<h1><a href="https://firebase.google.com">Firebase</a></h1>
Firebase is the database of the internet powering thousands of mobile and web applications. Firebase is easy-to-learn, easy-to-set-up and easy-to-insert-something. Google allows creating unlimited Firebase projects and the limits of free quota for read and write operations are quite generous. Also, its very convenient to browse data from the Firebase console.

<h1><a href="https://www.google.com/script/start">Google Apps Script</a></h1>
GAS comes from the crawlers of the internet. These are super-cool schedulers and hooks that could be attached to any service, end-point and it just *works*. We've used Apps Script to set up hourly schedulers to remind our REPLs that they need to be less sleepy.