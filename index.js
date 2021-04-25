const run = require('./runner').run;
const DEBUG_FLAG = "--debug";
const SERVER_FLAG = "--server";

function containsFlag(flag) {
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === flag) {
      return true;
    }
  }
  return false;
}

const shouldDebug = containsFlag(DEBUG_FLAG);
const runAsServer = containsFlag(SERVER_FLAG);
const actualArgs = process.argv.filter(x => [DEBUG_FLAG, SERVER_FLAG].indexOf(x) === -1);


if (runAsServer) {
  console.log("Running as server");
  const express = require('express');
  const fs = require('fs');
  const PORT = process.env.PORT || 5000;
  express()
  .use(express.json())
  .post('/test', async (req, res, next) => {
    res.send(req.body);
    next();
  })
  .post('/scrape', async (req, res, next) => {
    const hrstart = process.hrtime()
    const script = req.body.script;
    const input = req.body.input || "";
    const outputType = req.body.outputType || "";
    const callbackUrl = req.body.callbackUrl;
    if (!script || (outputType !== "" && outputType !== "json" && outputType !== "csv") || !callbackUrl) {
      res.send("400");
    } else {
      if (!fs.existsSync(script)) {
        res.send("404");
      } else {
        res.send("200");
      }
    }
    const hrend = process.hrtime(hrstart);
    const timing = `Execution time (hr): ${hrend[0]}s ${hrend[1] / 1000000}ms`;
    console.log(timing);
    next();
  })
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))


} else {
  if (process.argv.length < 3) {
    throw new Error('Expected at least 1 arguments: script.fscript "input"');
  }
  console.log("Executing command");
  const fileToRun = actualArgs[2];
  const input = actualArgs[3] || "";
  const output = actualArgs[4] || "";

  (async () => {
    run(fileToRun, input, output, shouldDebug)
  })();
}
