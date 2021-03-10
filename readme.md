Supported Commands
--------------------------

* item "selector"             | starts item; items are found at selector
* enditem                     | ends item;
* click "selector"            | clicks selector
* open "url"                  | opens url
* type "text" "selector"      | types text into selector
* waitForNavigation           | wait until the page changes; useful for searches

Subcommands
--------------------------

* allOf                       | returns the trimmed text value of all matching elements
* hrefOf                      | gets href attribute of an element
* maxOf                       | returns Math.max of an array
* numbersOf                   | gets number value of an element (removes non digits) OR changes anything into numbers if possible
* textOf                      | gets trimmed text value of an element  OR changes anything into text if possible
* textNodeOf                  | gets trimmed text of a text node only; useful for elements not directly surrounded by an element
* twoDecimalsOf               | used to get decimals back (divides by 100); useful for pricing
* valueOf                     | gets the value of something; useful for select


Example
------------------

```
item ".product"
  .name textOf "h6"
  .link hrefOf "h6 a"
  .set textOf ".small .row"
  .price numbersOf textNodeOf ".card-form p"
  .quantity numbersOf valueOf ".card-form select"
enditem
```