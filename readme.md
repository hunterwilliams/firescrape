Firescrape
=========================

This projects aims to make data collection across different websites and platforms easy for anyone.

It currently enables scraping in two methods:
* A command line tool - run scripts directly from your device
* REST API Server - run scripts on demand and with web post functionality


This project runs "scripts" which are instructions on how to scrape a website into usable data known as "items".


Running the project
------------------------

**Usual Method**

node index.js *path/script.yml* *(optional)input* *(optional)output.csv | output.json* *(optional) flags*

**Flags**

* *--server*      | Run the project in REST API Server mode
* *--show-errors* | Shows errors that occurred when making "items"
* *--debug*       | will print out debug information; useful for bug catching or making changes to this project

Items
-------------------------

Contain the defintion of how data should look like. 


*Subcommands*

These exist to take data from something in the html and make it make sense

* allOf                       | returns the trimmed text value of all matching elements
* hrefOf                      | gets href attribute of an element
* maxOf                       | returns Math.max of an array
* numbersOf                   | gets number value of an element (removes non digits) OR changes anything into numbers if possible
* textOf                      | gets trimmed text value of an element  OR changes anything into text if possible
* textNodeOf                  | gets trimmed text of a text node only; useful for elements not directly surrounded by an element
* titleOf                     | gets title attribute of an element
* twoDecimalsOf               | used to get decimals back (divides by 100); useful for pricing
* valueOf                     | gets the value of something; useful for select


Script Structure
--------------------------

Scripts contain ways to "scrape" a particular website and fit the data into a clear object

See scripts/sample for now. 



Future
--------------------------

* Allow nextpage of results to work 100%
* Taking "more" input such as from a file
* Some sort of filtering / comparison / unique (maybe similar to SQL)
* Handling browser crashes / fails to initialize
* attribute("X")
* calling other script from file OR nesting
* some sort of transformation eg for price and for partial links (partial links should be extract?? as this seems obvious issue)
* breakpoints (some way to pause/continue giant scraping jobs)
* solve issue with angular html element names
* remove the waitForSelector command (this one sucks for users to deal with)