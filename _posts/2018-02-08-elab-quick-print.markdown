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

![Screenshot](/assets/elab-report.png){:class="img-responsive"}

A demo version is currently live at <a href="http://elabreport.ml/">elabreport.ml</a>. Recommended to use Google Colab for the purpose. The response time isn't lightning fast because eLab servers are slow!

Find the GitHub repo <a href="https://github.com/rounakdatta/elab-quick-print">here</a>.