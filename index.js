const puppeteer = require('puppeteer');
const helpers = require('./helpers');

(async () => {


  const card = "Opt";
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const sabai = helpers.fscriptify("sabai.fscript");

  // const fizzy = helpers.fscriptify("fizzy.fscript");

  const sabaiResults = await sabai(page, card);

  // const fizzyResults = await fizzy(page, card);

  // const results = sabaiResults.concat(fizzyResults);

  await page.screenshot({
    path: "./screenshot.jpg",
    type: "jpeg",
    fullPage: true
  });

  await browser.close();

  // const filteredAndSorted = results.filter(x => x.name === cardName && x.quantity > 0).sort((a,b) => a.price - b.price);

  // console.log("All Results --------------------------------");
  // console.log(filteredAndSorted);
  // console.log("Cheapest: " + filteredAndSorted[0].price + "THB @ " + filteredAndSorted[0].link)
  console.log("done");
})();