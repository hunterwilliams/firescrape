const puppeteer = require('puppeteer');
const helpers = require('./helpers');

async function run(fileToRun, input, shouldDebug, showErrors) {

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const scraper = helpers.fscriptify(fileToRun, shouldDebug);

  const scraperResults = await scraper(page, input);
  const results = scraperResults.results;

  await browser.close();

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
    if (shouldDebug) {
      console.log("--------------------------------");
      console.log("--------Results With Error------");
      console.log(results);
      console.log("----End of Results With Error---");
      console.log("--------Meta---------------------");
      console.log(scraperResults.meta);
      console.log("--------End of Meta--------------");
    }
  }

  const dataToShow = showErrors ? scraperResults : results.map(x => x.value);

  return dataToShow;
}

exports.run = run;