const fs = require('fs');

function debug(str) {
  console.log("DEBUG: " + str);
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
    } else if (currentCommand === "maxOf") {
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

async function handleCommand(page, command, input, inItem=false, itemDef={}, inString=false) {
  const theCommand = command[0];
  command.splice(0, 1);
  const remaining = command;

  if (theCommand.startsWith('"') || theCommand.endsWith('"') || inString) {
    if (theCommand === "$INPUT" && !inString){
      if (remaining.length > 0) {
        const nextString = await handleCommand(page, remaining, input, inItem, itemDef, false);
        return [input].concat(nextString);
      }
      return [input];
    }
    let text = theCommand.replace("$INPUT", input);
    let stillInString = inString;
    if (text.startsWith('"') && !stillInString) {
      stillInString = true;
      text = text.substr(1,text.length-1);
    }
    if (text.endsWith('"') && stillInString) {
      stillInString = false;
      text = text.substr(0,text.length-1);
      if (remaining.length === 0) {
        return [text];
      } else {
        const nextString = await handleCommand(page, remaining, input, inItem, itemDef, false);
        return [text].concat(nextString);
      }
    }
    if (remaining.length === 0) {
      return text;
    }
    const subtext = await handleCommand(page, remaining, input, inItem, itemDef, stillInString);
    return [text + " " + subtext[0]];
  }

  if (["allOf", "maxOf", "numbersOf","hrefOf", "textOf", "textNodeOf", "valueOf"].indexOf(theCommand) !== -1) {
    if (remaining.length == 0) {
      return {subcommand: [theCommand], path: ""};
    }
    const other = await handleCommand(page, remaining, input, inItem, itemDef);

    let path = "";
    let subcommandArray = [];
    if (other && other.subcommand) {
      path = other.path;
      subcommandArray = other.subcommand;
    } else if (other && other[0] !== ""){
      path = other[0];
    }
    subcommandArray.push(theCommand);

    return {subcommand: subcommandArray, path};
  }

  if (theCommand[0] === "." && inItem) {
    const otherParts = await handleCommand(page, remaining, input, inItem, itemDef);
    return {property: theCommand.substr(1, theCommand.length - 1), ...otherParts};
  }

  if (theCommand === "type") {
    const params = await handleCommand(page, remaining, input, inItem, itemDef);
    if (params.length !== 2) {
      throw new Error("type command Expected 2 params");
    }
    await page.type(params[1], params[0]);
    return undefined;
  }

  if (theCommand === "click") {
    if (remaining.length <= 0) {
      throw new Error("Click command needs arguments");
    }
    const path = await handleCommand(page, remaining, input, inItem, itemDef);
    await page.click(path[0]);
    return undefined;
  }

  if (theCommand === "waitForNavigation") {
    await page.waitForNavigation();
    return undefined;
  }
  
  if (theCommand === "open") {
    if (remaining.length <= 0) {
      throw new Error("Open command needs arguments");
    }
    const url = await handleCommand(page, remaining, input, inItem, itemDef);
    await page.goto(url[0]);
    return undefined;
  }
  if (theCommand === "item") {
    const path = await handleCommand(page, remaining, input, inItem, itemDef);
    return {path: path[0], itemstart:true};
  }
  if (theCommand === "enditem") {
    if (itemDef === {}) {
      throw new Error("expecting item definition");
    }
    debug("attempting to retieve items with def: " + JSON.stringify(itemDef));
    const items = await page.$$eval(itemDef.path, retrieveItem, itemDef);
    return {items};
  }
  throw new Error("Unsupported command: " + theCommand);

}

function fscriptify(scriptFilePath) {
  return async function(page, input) {
    const rawFile = fs.readFileSync(scriptFilePath);
    const lines = rawFile.toString().split('\n').filter(x => x !== "");

    let items = [];
    let inItem = false;
    let itemDef = {};
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].replace(/\s\s+/g, ' ').trim().split(" ");
      const result = await handleCommand(page, line, input, inItem, itemDef);
      if (result && result.itemstart) {
        itemDef.path = result.path;
        itemDef.props = [];
        inItem = true;
      }
      if (result && result.property && inItem) {
        itemDef.props.push(result);
      }
      if (result && result.items) {
        items = items.concat(result.items);
        itemDef = {};
        inItem = false;
      }
    }
    console.log("items:" + JSON.stringify(items));
    return items;
  };

}

exports.fscriptify = fscriptify;