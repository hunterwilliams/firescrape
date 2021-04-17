const puppeteer = require('puppeteer');
const exportAs = require('./exportAs');
const helpers = require('./helpers');
const DEBUG_FLAG = "--debug";

if (process.argv.length < 3) {
  throw new Error('Expected at least 1 arguments: script.fscript "input"');
}
const fileToRun = process.argv[2];
const input = process.argv[3] || "";
const output = process.argv[4] || "";
const shouldDebug = process.argv[process.argv.length - 1] === DEBUG_FLAG;

(async () => {

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const scraper = helpers.fscriptify(fileToRun, shouldDebug);

  const results = await scraper(page, input);

  await page.screenshot({
    path: "./screenshot.jpg",
    type: "jpeg",
    fullPage: true
  });

  await browser.close();

  //const filteredAndSorted = results.map(x => x.value).filter(x => x.name === card && x.quantity > 0).sort((a,b) => a.price - b.price);
  // console.log("Cheapest: " + filteredAndSorted[0].price + "THB @ " + filteredAndSorted[0].link)

  let hasError = false;
  for (let i = 0; i < results.length; i += 1) {
    const keys = Object.keys(results[i].error);
    for (let j = 0; j < keys.length; j += 1) {
      if (results[i].error[keys[j]] !== false) {
        hasError = results[i].error[keys[j]];
        break;
      }
    }
  }

  if (hasError !== false) {
    console.log("Results have some error...");
    console.log(hasError);
    console.log("--------------------------------");
    console.log("--------Results With Error------");
    console.log(results);
    console.log("----End of Results With Error---");
  }

  console.log("--------------Results-------------------");
  const dataToShow = results.map(x => x.value);
  console.log(dataToShow);
  console.log("------------End of Results--------------");

  if (output !== "" && output !== DEBUG_FLAG) {
    console.log("Attempting to save: " + output);
    if (output.endsWith(".json")) {
      exportAs.jsonFile(output, dataToShow);
    } else if (output.endsWith(".csv")) {
      exportAs.csvFile(output, dataToShow);
    } else {
      console.log("Unsupported export format");
    }
  } else {
    console.log("No output saved");
  }
})();