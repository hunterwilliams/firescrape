const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();


  const cardName = "Opt"
  const PLACEHOLDER_ARG = "%ARG%";
  const LINK_SABAI = "https://www.sabaicards.com/cards/?disp=all&name=%ARG%"
  const LINK_FIZZY = "https://www.fizzyhobbystore.com/card/category/0";


  const sabai = LINK_SABAI.replace(PLACEHOLDER_ARG, cardName);
  await page.goto(sabai);

  const sabaiResults = await page.$$eval("#card-gallery-container .galley_view_container", elements => elements.map(cardHolder => {
    return {
      name: cardHolder.querySelector(".card-name").textContent,
      link: cardHolder.querySelector(".card-name a").getAttribute("href"),
      set: cardHolder.querySelector(".card-set-code").textContent,
      price: cardHolder.querySelector(".card-text-price").textContent.replace(/\D/g,''),
      quantity: cardHolder.querySelector(".out-of-stock") !== null ? 0 : Math.max(...(Array.from(cardHolder.querySelectorAll(".cart-quantity-content button")).map(el => parseInt(el.textContent)))),
    };
  }));

  await page.goto(LINK_FIZZY);
  await page.type(".container form input[type='search']", cardName);
  await page.click(".container form button.btn2");

  await page.waitForNavigation();

  const fizzyResults = await page.$$eval(".product", elements => elements.map(cardHolder => {
    return {
      name: cardHolder.querySelector("h6").textContent,
      link: cardHolder.querySelector("h6 a").getAttribute("href"),
      set: cardHolder.querySelector(".small .row").textContent.trim(),
      price: (cardHolder.querySelector(".card-form p").childNodes.length > 1 ? cardHolder.querySelector(".card-form p").childNodes[1].textContent : cardHolder.querySelector(".card-form p").textContent).replace(/\D/g,''),
      quantity: cardHolder.querySelector(".card-form select") !== null ? cardHolder.querySelector(".card-form select").value : 0,
    };
  }));
  const results = sabaiResults.concat(fizzyResults);
  await browser.close();

  const filteredAndSorted = results.filter(x => x.name === cardName && x.quantity > 0).sort((a,b) => a.price - b.price);

  console.log("All Results --------------------------------");
  console.log(filteredAndSorted);
  console.log("Cheapest: " + filteredAndSorted[0].price + "THB @ " + filteredAndSorted[0].link)
})();