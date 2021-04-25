const run = require('./runner').run;
const DEBUG_FLAG = "--debug";
const SERVER_FLAG = "--server";

if (process.argv.length < 3) {
  throw new Error('Expected at least 1 arguments: script.fscript "input"');
}

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

const fileToRun = actualArgs[2];
const input = actualArgs[3] || "";
const output = actualArgs[4] || "";


if (runAsServer) {
  console.log("Running as server");
} else {
  console.log("Executing command");
  (async () => {
    run(fileToRun, input, output, shouldDebug)
  })();
}
