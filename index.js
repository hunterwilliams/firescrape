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
