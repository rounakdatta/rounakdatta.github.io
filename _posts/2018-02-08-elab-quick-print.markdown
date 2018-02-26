---
layout: post
title: "eLab Report Generator"
hidden: true
visible: 0
---
Quickly get your eLab record generated

- Doesn't matter if questions are incomplete in between

- Accepts C, C++, Java, Python as the available options for program evaluation

- Evaluates only the completed and 100% verified questions

- Collects all the evaluation reports in PNG format, converts them to PDF and concatenates all the PDFs

- Single PDF file shareable with classmates to share progress / as final eLab submission report

- Uses Python library - _requests_ (for getting the reports) and _img2pdf_ (for converting to PDF) instead of (resource heavy and difficult-to-use) Selenium.

- Response time : 10s

![Screenshot](/assets/elab-report.png){:class="img-responsive"}

The site is currently live at <a href="http://elabreport.ml/">elabreport.ml</a>.

Find the GitHub repo <a href="https://github.com/rounakdatta/elab-quick-print">here</a>.