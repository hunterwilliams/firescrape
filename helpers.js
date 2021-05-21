const yaml = require('js-yaml');
const fs   = require('fs');

let printDebug = false;

function debug(str) {
  if (printDebug) {
    console.log("DEBUG: " + str);
  }
}

function retrieveItem(arrayOfItems, itemDef) {
  function handleSubcommand(element, path, remainingCommands, currentValue) {

    const currentCommand = remainingCommands[0];

    let newValue = "";
    let newError = false;

    if (currentCommand === "textOf") {
      if (currentValue) {
        newValue = "" + currentValue;
      }
      if (!currentValue) {
        try {
          newValue = element.querySelector(path).textContent.trim();
        } catch (e) {
          newValue = "";
          newError = e.toString();
        }
      }
    } else if (currentCommand === "valueOf") {
      if (currentValue) {
        newValue = "" + currentValue;
      }
      if (!currentValue) {
        try {
          newValue = element.querySelector(path).value.trim();
        } catch (e) {
          newValue = "";
          newError = e.toString();
        }
      }
    } else if (currentCommand === "textNodeOf") {
      if (currentValue) {
        newValue = "" + currentValue;
      }
      if (!currentValue) {
        try {
          let parentNode = element.querySelector(path);
          for (let i = 0; i < parentNode.childNodes.length; i++) {
            if (parentNode.childNodes[i].nodeType === 3) {
              newValue =  parentNode.childNodes[i].textContent.trim();
            }
          }
          newError = "Could not find textnode";
        } catch (e) {
          newValue = "";
          newError = e.toString();
        }
      }
    } else if (currentCommand === "hrefOf") {
      if (currentValue) {
        newError = "Cannot get hrefOf existing values..."
      } else {
        try {
          newValue = element.querySelector(path).getAttribute("href");
        } catch (e) {
          newValue = "";
          newError = e.toString();
        }
      }
    } else if (currentCommand === "srcOf") {
      if (currentValue) {
        newError = "Cannot get srcOf existing values..."
      } else {
        try {
          newValue = element.querySelector(path).getAttribute("src");
        } catch (e) {
          newValue = "";
          newError = e.toString();
        }
      }
    }else if (currentCommand === "titleOf") {
      if (currentValue) {
        newError = "Cannot get titleOf existing values..."
      } else {
        try {
          newValue = element.querySelector(path).getAttribute("title");
        } catch (e) {
          newValue = "";
          newError = e.toString();
        }
      }
    } else if (currentCommand === "numbersOf") {
      
      if (currentValue) {
        if (typeof currentValue === "string") {
          newValue = parseFloat(currentValue.replace(/\D/g,''));
        } else if (Array.isArray(currentValue)) {
          newValue = currentValue.map(x => parseFloat(x.replace(/\D/g,'')));
        }
      } else {
        try {
          newValue = parseFloat(element.querySelector(path).textContent.replace(/\D/g,''));
        } catch (e) {
          newValue = 0;
          newError = e.toString();
        }
      }
    } else if (currentCommand === "hasTwoDecimals") {
      
      if (!currentValue) {
        newError = "expecting some input value";
      } else {
        try {
          newValue = currentValue / 100.0;
        } catch (e) {
          newValue = 0;
          newError = e.toString();
        }
      }
    }else if (currentCommand === "maxOf") {
      if (Array.isArray(currentValue) === false) {
        newError = "must have array of items to get maxOf - current value:" + JSON.stringify(currentValue);
      } else {
        try {
          if (currentValue.length === 0) {
            newValue = 0;
          } else {
            newValue = Math.max(...currentValue);
          }
        } catch (e) {
          newValue = 0;
          newError = e.toString();
        }
      }
    } else if (currentCommand === "allOf") {
      try {
        newValue = Array.from(element.querySelectorAll(path)).map(el => el.textContent);
      } catch (e) {
        newValue = [];
        newError = e.toString();
        return {value: currentValue, error: "fail in AllOf"};
      }
    } else {
      return {value: "", error: "unknown command: " + currentCommand};
    }

    if (remainingCommands.length > 1) {
      let nextCommands = [...remainingCommands];
      nextCommands.splice(0, 1);
      return handleSubcommand(element, path, nextCommands, newValue);
    }
    
    return {value: newValue, error: newError};
  }

  return arrayOfItems.map(currentElement => {
    let currentItem =  {value: {}, error: {}};
    let elementToUse = currentElement;
    function handleStepCommand(commandObj) {
      const command = commandObj.command;
      const value = commandObj.value;
      console.log("handle step: " + command);
      if (command === "click") {
        const elementToClick = elementToUse.querySelector(value);
        console.log("going to try to click: " + elementToClick);
        elementToClick.click();
      } else if (command === "useAsItem") {
        elementToUse = window.document.querySelector(value);
        console.log("new element to use:" + elementToUse);
      }
    }
    console.log("before steps");
    for (let i = 0; i < itemDef.beforeSteps.length; i += 1) {
      handleStepCommand(itemDef.beforeSteps[i]);
    }
    console.log("getting item");
    for (let i = 0; i < itemDef.props.length; i += 1) {
      const currentProp = itemDef.props[i];
      const currentPropName = currentProp.property;
      // get each property recursively!
      const subcommandResults = handleSubcommand(elementToUse, currentProp.path, currentProp.subcommand);
      currentItem.value[currentPropName] = subcommandResults.value;
      currentItem.error[currentPropName] = subcommandResults.error;
    }
    console.log("after stpes");
    for (let i = 0; i < itemDef.afterSteps.length; i += 1) {
      handleStepCommand(itemDef.afterSteps[i]);
    }

    return currentItem;
  });
}

async function handleCommand(page, command, input, results=[], waitingForChange="", pageNumber="") {
  const theCommand = Object.keys(command)[0];
  let theValue = command[theCommand];
  debug("c: "+theCommand);

  function getArgs(value, numberRequired){
    let values = typeof value === "string" ? value.replace("$INPUT", input).replace("$PAGE", pageNumber).split('"').filter(x => x !== "") : value;
    if (values.length < numberRequired) {
      throw new Error(`Could not find ${numberRequired} params`);
    }
    return values;
  }

  if (theCommand === "type") {
    if (!theValue.path || !theValue.value) {
      throw new Error("Expecting path and value for command type");
    }
    await page.type(
      getArgs(theValue.path, 1)[0], 
      getArgs(theValue.value, 1)[0]
    );
    return undefined;
  }

  if (theCommand === "click") {
    const params = getArgs(theValue, 1);
    await page.click(params[0]);
    return undefined;
  }

  if (theCommand === "screenshot") {
    const path = getArgs(theValue.path || './screenshot.jpg', 0)[0];
    await page.screenshot({
      path,
      type: "jpeg",
      fullPage: false
    });
    return undefined;
  }

  if (theCommand === "expectChange") {
    const params = getArgs(theValue, 1);
    const waiting = await page.$eval(params[0], e => e.textContent);
    return {
      waiting
    };
  }

  if (theCommand === "checkPageOrLoop") {
    const params = getArgs(theValue, 1);
    const currentPage = await page.$eval(params[0], e => e.textContent);
    return {
      currentPage: parseInt(currentPage.trim().replace(/\D/g,''))
    };
  }

  if (theCommand === "wait") {
    const params = getArgs(theValue, 1);
    await new Promise(r => setTimeout(r, params[0]));
    return undefined;
  }

  if (theCommand === "waitForExpected") {
    const params = getArgs(theValue, 1);
    for (let i = 0; i < 15; i += 1) {
      const waiting = await page.$eval(params[0], e => e.textContent);
      debug("waiting value before: " + waitingForChange);
      debug("waiting value now:"  + waiting);
      if (waiting !== waitingForChange) {
        return undefined;
      }
      await new Promise(r => setTimeout(r, 1000));
    }
    throw new Error("Value did not change as expected");
  }

  if (theCommand === "waitForHiding") {
    const params = getArgs(theValue, 1);
    await page.waitForSelector(params[0], {hidden:true});
    return undefined;
  }

  if (theCommand === "waitForNavigation") {
    await page.waitForNavigation();
    return undefined;
  }

  if (theCommand === "waitForSelector") {
    const params = getArgs(theValue, 1);
    await page.waitForSelector(params[0]);
    return undefined;
  }

  if (theCommand === "viewport") {
    await page.setViewport({ width: theValue.width, height: theValue.height });
    return undefined;
  }
  
  if (theCommand === "open") {
    const params = getArgs(theValue, 1);
    await page.goto(params[0]);
    return undefined;
  }

  if (theCommand === "item") {
    const path = theValue.path || "";
    const potentialProps = theValue.properties;
    const props = [];
    for (let i = 0; i < potentialProps.length; i++) {
      const propName = Object.keys(potentialProps[i])[0];
      const params = getArgs(potentialProps[i][propName]);
      props.push({
        property: propName,
        subcommand: params[0].trim().split(" ").reverse(),
        path: params[1],
      });
    }
    const beforeSteps = [];
    const itemBefore = theValue.beforeSteps || [];
    for (let j = 0; j < itemBefore.length; j ++) {
      const key = Object.keys(itemBefore[j])[0];
      beforeSteps.push({
        command: key,
        value: getArgs(itemBefore[j][key])[0]
      });
    }
    const afterSteps = [];
    const itemAfter = theValue.afterSteps || [];
    for (let j = 0; j < itemAfter.length; j ++) {
      const key = Object.keys(itemAfter[j])[0];
      afterSteps.push({
        command: key,
        value: getArgs(itemAfter[j][key])[0]
      });
    }
    let itemDef = {path, props, beforeSteps, afterSteps};
    debug("attempting to retieve items with def: " + JSON.stringify(itemDef));

    let items = [];
    let lastPageCount = 0;
    let pages = 1;

    const pagesConfig = {
      maxPages: 5,
      steps: [],
      ...theValue.pages
    };

    while (pages <= pagesConfig.maxPages) {
      await page.waitForSelector(path);
      const pageItems = await page.$$eval(itemDef.path, retrieveItem, itemDef);
      debug(`got ${pageItems.length} items`);

      items = items.concat(...pageItems);

      if ((pages === 1 && pageItems.length === 0) || (pageItems.length < lastPageCount) || pagesConfig.steps.length === 0) {
        debug("should be done with pages")
        break;
      }
      lastPageCount = pageItems.length;
      
      let waitingValue = "";
      let resetSteps = 0;
      if (pages < pagesConfig.maxPages) {
        debug("going to next page");
        const expectedPage = pages + 1;
        for (let i = 0; i < pagesConfig.steps.length; i += 1) {
          try {
            const result = await handleCommand(page, pagesConfig.steps[i], input, [], waitingValue, expectedPage);
            if (result && result.waiting) {
              waitingValue = result.waiting;
              debug("storing waiting as :" + waitingValue);
            }
            if (result && result.currentPage) {
              if (result.currentPage === expectedPage) {
                debug("arrived to next page");
              }
              else if (result.currentPage !== expectedPage && resetSteps < 10) {
                debug(`attempt ${resetSteps} to get to the next page`);
                debug("currentPage is:" + result.currentPage);
                debug("expected page is: "+ (expectedPage));
                debug("-------------------------------------");
                await new Promise(r => setTimeout(r, resetSteps * 100 + 100));
                i = -1;
                resetSteps++;
              } else {
                debug("couldn't go to next page");
              }
            }
          }
          catch (e) {
            debug(e.toString());
            debug("had an error on nextitem step");
          }
        }
      } else {
        debug("stopping pages");
      }
      debug(`finished page ${pages} of up to ${pagesConfig.maxPages}`);
      pages ++;
    }
    return {items};
  }
  if (theCommand === "distinct") {
    const params = getArgs(theValue, 1);

    function onlyUnique(value, index, self) {
      return self.indexOf(value) === index;
    }
    let uniqueValues = results.map(x => {
      try {
        return x.value[params[0]];
      } catch (e) {
        debug("had an issue getting distinct values: ", e);
        return "";
      }
      
    }).filter(onlyUnique);
    const returnResults = [];
    for (let i = 0; i < results.length; i += 1){
      const checkProperty = results[i].value[params[0]];
      let index = uniqueValues.indexOf(checkProperty);
      if (index > -1) {
        returnResults.push(results[i]);
        uniqueValues.splice(index, 1);
        if (uniqueValues.length === 0){
          break;
        }
      }
    }

    return {results: returnResults};
  }
  if (theCommand === "script") {
    debug("script>>>>>>>")
    const params = getArgs(theValue, 1);
    const otherScript = fscriptify(params[0], printDebug);
    const otherScriptResults = await otherScript(page, path[1] || "");
    debug("other script results");
    return {results: otherScriptResults};
  }
  if (theCommand === "identify") {
    let returnResult = {};
    let identifyValue = false;
    returnResult.steps = false;
    for (let i = 0; i < theValue.cases.length; i++) {
      if (theValue.cases[i].default) {
        debug("on default case");
        identifyValue = theValue.cases[i].default.value;
        returnResult.steps = theValue.cases[i].default.run;
        break;
      } else {
        if (theValue.cases[i].case.elementExists) {
          try {
            await page.waitForSelector(theValue.cases[i].case.elementExists, { timeout: 5000 })
            debug("case success for " + theValue.cases[i].case.value + " having " + theValue.cases[i].case.elementExists);
            identifyValue = theValue.cases[i].case.value;
            returnResult.steps = theValue.cases[i].case.run;
            break;
          } catch (error) {
            debug("case failed for " + theValue.cases[i].case.value + " having " + theValue.cases[i].case.elementExists);
          }
        }
      }
    }
    if (theValue.output) {
      debug("will save output and save as " + theValue.output);
      returnResult.output = {
        outputLabel: theValue.output,
        outputValue: identifyValue
      };
    }
    return {results: returnResult};
  }
  throw new Error("Unsupported command: " + theCommand);

}

function fscriptify(scriptFilePath, shouldDebug=false) {
  printDebug = shouldDebug;
  return async function(page, input) {
    const doc = yaml.load(fs.readFileSync(scriptFilePath, 'utf8'));

    let scripts = [];
    let identify = false;
    if (doc.overall) {
      for (let i = 0; i < doc.overall.length; i ++) {
        const nameOfKey = Object.keys(doc.overall[i])[0];
        if (nameOfKey === "script") {
          scripts.push(doc.overall[i].script)
        } else if (nameOfKey === "identify") {
          identify = doc.overall[i].identify;
        }
      }
    } else if (doc.script) {
      scripts.push(doc.script);
    }

    async function handleScript(script) {
      let items = [];
      let results = [];

      for (let i = 0; i < script.steps.length; i++) {
        const step = script.steps[i];
        try {
          const result = await handleCommand(page, step, input, results);
          if (result && result.results) {
            results = result.results;
            debug("setting results");
          }
          if (result && result.items) {
            items = items.concat(result.items);
          }
        } catch (e) {
          console.log(step);
          console.log(e);
        }
      }

      if (items.length === 0)
      {
        return results;
      }
      return items;
    }

    if (!identify) {
      if (scripts.length === 1) {
        const results = await handleScript(scripts[0]);
        return {results: results, meta: {}};
      } else {
        console.log("Too many scripts - cannot pick 1");
        return {results:[], meta: {}};
      }
    } else {
      const identifyResults = await handleScript(identify);
      let outputObject = {};
      if (identifyResults.output) {
        outputObject[identifyResults.output.outputLabel] = identifyResults.output.outputValue;
      }
      if (!identifyResults.steps) {
        return {results:[], meta:{...outputObject}};
      } else {
        const results = await handleScript(identifyResults.steps);
        return {results:results, meta:{...outputObject}};
      }
    }
    
  };

}

exports.fscriptify = fscriptify;