+++
title = "Better managing self-finance with Firefly"
author = ["Rounak Datta"]
date = 2020-05-25T00:00:00+05:30
tags = ["finance", "self-hosted"]
draft = false
+++

## To what extent do we track our money? {#to-what-extent-do-we-track-our-money}

Sites and apps are constantly tracking us so closely, with the only intention of knowing us better and presenting us with more self-relatable content (and potentially ads) and engage us even more into the product. We track our shipments, food, health, habits and reasonably quite everything that costs us time. Yeah, of course we do try to keep a sense of our spendings and definitely give a appreciating / regretting thought at the month-end. There being no well-defined "goods and bads" of how and where to spend, I believe it's a good practice to always keep our financial data handy and derive inferences from the same as and when required.

Of course [Data Is Beautiful](https://www.reddit.com/r/dataisbeautiful/), but a more beautiful feeling is being command of your monies and not the other way round. Coming directly to the point, I started tracking my spendings for the importantly these reasons:

-   Get a clear picture of how much I'm spending in every segment (food / transport / hobbies / bills etc)
-   How much I am worth now (getting to that number really fast) and can I afford that dream X
-   Recalling when I last visited that Y (restaurant / movie / bookstore / Spotify subscription).


## But why wouldn't the bank statement help? {#but-why-wouldn-t-the-bank-statement-help}

Bank transactions are the true trackers of your online spendings, but the data is in silos and not ready for specialized (or I'd say analytical) consumption. And often bank statements (its ~3y for me) lock out older transaction details to be downloaded and processed. Of course we can regularly download those transaction details on a regular basis and maintain an Excel sheet with sophisticated formulas. This is the nerd way of doing it and it surely works like a charm 😄. Yeah, dumping those data into a well-normalized SQL-like datastore would be the next level of it 😎.


## But there are apps for that right? {#but-there-are-apps-for-that-right}

Yes, sure, 21st century makes sure that there's an app for every task you do, making your life convenient; and easy for those in hunt of crowdsourcing data-driven products. We preach that we must own our data and have full controls over it, but deep down we are okay to let someone else use it for a service that pleases you.

Well, financial data is quite sensitive, and it's privacy must not be taken for granted. Needless to repeat here how important it is for us to highly trust a website / app while doing an online transaction through it. And this fact cannot be stressed enough for apps which are deliberately built for this purpose. In India, we have apps like [Walnut](https://www.getwalnut.com/), [ET Money](https://www.etmoney.com/money-manager), [FinArt](https://www.finart.app/) which help you provide with insightful (and definitely beautiful) charts, tables and aggregated figures which helps us make sense of our money better. These are absolutely free to use except the hidden price to pay for is your data. They are tracking each ins and outs from your banks which is in turn helping them improve their **credit score models** and ultimately taking the bank-form (becoming a lending app). The engineering is interesting here on how your spending habits (are the spendings most on the weekend? is it mostly around Koramangala? is it mostly on booze? is it Uber or bus-rides? what's your salary? what's your eat-out temptation? how much rent do you pay?) are enabling them to get a very complete picture of yours (becoming the Google of fintech) and providing you with loans / suggestions according to that. It's hard to believe how much value could it be to all the consumer companies to hold these data (just like how [Aarogya Setu's data's democratization could open up opportunities](https://the-ken.com/story/the-elite-vc-founder-club-riding-aarogya-setu-to-telemed-domination/)).

Did we miss saying that [CRED](https://www.cred.club/), [Jupiter](https://jupiter.money/), [Niyo](https://www.goniyo.com/), [PayZello](https://payzello.com/), [BankOpen](https://www.bankopen.co/) (just to name a few) are all in the game to catch the same fish?

So, although convenient, maybe it's not quite right 😕.


## TLDR; Introducing Firefly {#tldr-introducing-firefly}

And therefore, here comes the self-help way of doing it - Firefly. As a quick gist, Firefly is an open-source web-based software which abstracts out all the finance managements to simple clicks, yet has a modular, robust architecture backed by databases. The best parts of it are:

-   It's open source folks - missing a feature? build it yourself and contribute back! Want your custom extension? build it!
-   You self-host it - and get full control of your data.

Firefly's homepage is <https://www.firefly-iii.org/> and the project is mostly maintained by a single man 🙏! There has been enormous amount of good discussions on what (and how) Firefly supports and what it doesn't in the documentation as well as in the [GitHub issues](https://github.com/firefly-iii/firefly-iii/issues).

When you set up Firefly on your local system or a remote server, you set up a `firefly` database for Firefly to use. It would contain all the normalized tablular data which can be crunched in various forms from an intuitive web user-interface.

1.  Provides with neat and exact numbers on bank balances, spends across categories, budgets and more
2.  Displays stunning charts of balance-vs-time for all my bank accounts
3.  Quickly helps me search for when a particular transaction (like say Buying Eggs) happened before
4.  Helps me compare my monthly spendings, and get to why exactly one is greater than another
5.  Well behaves with foreign transactions as well
6.  Doesn't mess up my anxiety by treating a self-transfer (from my bank to my another bank) as an expense
7.  Helps anyone get started with it by import bank statements (downloaded as CSV there) to Firefly in a breeze
8.  It's web-based, means anytime, anywhere on any device!
9.  Helps me set up a partner account to help my dear ones take a glance of the data
10. Satisfies the developer inside me by providing with an API (automations galore! 🎉)
11. Helps me save up for big and small goals with a well knitted piggy bank system.

{{< figure src="/ox-hugo/firefly.png" caption="<span class=\"figure-number\">Figure 1: </span>Sample Firefly Dashboard taken from <https://www.firefly-iii.org/#screenshots>" >}}


## My Setup {#my-setup}

Firefly is a very lightweight PHP-based application and has been hosted by me on a tiny DigitalOcean instance and has been neatly reverse-proxied through nginx. It's now a practice of mine for every transaction I do to manually put it on Firefly and smile when the bank balance and the Firefly calculation exactly matches 🙂.


## What automations could we possibly do? {#what-automations-could-we-possibly-do}

Well, we could do a lot of automations like making a POST request to Firefly when a Bank SMS is received so that the entire chain of making a transaction → recording it on Firefly is complete. This part gets more exciting, and a new post awaits that. Until next time! 👋


## +HUGO_BASE_DIR: ./src {#plus-hugo-base-dir-dot-src}
