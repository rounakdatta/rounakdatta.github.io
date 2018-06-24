---
layout: post
title: "Fake News Detection"
hidden: true
visible: 0
---
[![SRM IET Hackathon 2018](/assets/iet.png)](http://www.theiet.in/)

<br>
Team NightOwls : **_Niladri Shekhar Dutt_, _Arko Chatterjee_, _Saurav Saha_, _Rounak Datta_**
<br><br>
**This project secured the second position in the SRM-IET Hackathon 2018.**
<hr>

<iframe width="560" height="315" src="https://www.youtube.com/embed/aZzxZA_KfXY" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>

## Problem Statement

Often sensational news is created and spread through social media to achieve intended end. On the other hand, it may also involve narration of a true fact however being deliberately exaggerated. This may also affect the affect the importance of serious news media. The problem is to identify the authenticity of the news and online content. Equally important problem is to identify the bots involved in spreading false news.

![Demo](/assets/demo.gif){:class="img-responsive"}

### Approach
* The problem can be broken down into 3 statements :-

    1. Use NLP to check the authenticity of a news article.

    2. If the user has a query about the authenticity of a search query then he/she can directly search on our platform and using our custom algorithm we output a confidence score.

    3. Check the authenticity of a news source.

1. Articles can be analyzed by feeding them to a machine learning model (Passive Aggressive Classifier) which predicts the genuinity of the content after it's trained through predefined datasets of classified real vs fake news.
2. Search terms can be analyzed by doing a Google search (first 100 entries) and and ensuring if the news corresponding to the keywords have been covered by reliable news sources and aggregators. For every search term covered by a reliable news source it recieves a score of +1, while we heavily penalize fake sources. If multiple fake sources cover the news then we penalize the truth score even harder. We also look for keywords like 'hoax', 'fake', etc in the payload content.
3. An URL (news source) can be analyzed if it's authentic by checking it in our database of true news provider and false news provider.

### Application

When the fake-news detector is hosted locally / on a cloud platform, it can predict fake news with reasonable accuracy. Since edge cases of fake-news detection are controversial, the tool outputs a probability percentage instead of a rigid label.

### Usage

```
make
```

This will start the local server at localhost:8000.

_**Deps**: sklearn, pandas, django, requests, bs4_

Find the GitHub repo <a href="https://github.com/rounakdatta/xcheck">here</a>.