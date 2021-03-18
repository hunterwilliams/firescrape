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
    } else if (currentCommand === "titleOf") {
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
    for (let i = 0; i < itemDef.props.length; i += 1) {
      const currentProp = itemDef.props[i];
      const currentPropName = currentProp.property;
      // get each property recursively!
      const subcommandResults = handleSubcommand(currentElement, currentProp.path, currentProp.subcommand);
      currentItem.value[currentPropName] = subcommandResults.value;
      currentItem.error[currentPropName] = subcommandResults.error;
    }

    return currentItem;
  });
}

async function handleCommand(page, command, input, results=[]) {
  const theCommand = Object.keys(command)[0];
  let theValue = command[theCommand];
  debug("c: "+theCommand);

  function getArgs(value, numberRequired){
    let values = value.replace("$INPUT", input).split('"').filter(x => x !== "");
  
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
    await page.screenshot({
      path: theValue.path || "./screenshot.jpg",
      type: "jpeg",
      fullPage: false
    });
    return undefined;
  }

  if (theCommand === "waitForNavigation") {
    await page.waitForNavigation();
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
    let itemDef = {path, props};
    debug("attempting to retieve items with def: " + JSON.stringify(itemDef));
    await page.waitForSelector(path);
    const items = await page.$$eval(itemDef.path, retrieveItem, itemDef);
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
  throw new Error("Unsupported command: " + theCommand);

}

function fscriptify(scriptFilePath, shouldDebug=false) {
  printDebug = shouldDebug;
  return async function(page, input) {
    const doc = yaml.load(fs.readFileSync(scriptFilePath, 'utf8'));

    let items = [];
    let results = [];
    for (let i = 0; i < doc.script.steps.length; i++) {
      const step = doc.script.steps[i];
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
  };

}

exports.fscriptify = fscriptify;