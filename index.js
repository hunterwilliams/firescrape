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
  console.log('Running as server');
  const express = require('express');
  const tiny = require('tiny-json-http');
  const queue = require('./queue/main');
  const fs = require('fs');
  const PORT = process.env.PORT || 5000;
  express()
  .use(express.json())
  .post('/test', async (req, res, next) => {
    res.send(req.body);
    console.log('==============start of logged request==================')
    console.log('got a request')
    console.log(req.body);
    console.log('==============end of logged request====================')
    next();
  })
  .post('/scrape', async (req, res, next) => {
    const hrstart = process.hrtime();
    const cleanup = () => {
      const hrend = process.hrtime(hrstart);
      const timing = `Execution time (hr): ${hrend[0]}s ${hrend[1] / 1000000}ms`;
      console.log(timing);
      next();
    }
    const script = req.body.script;
    const input = req.body.input || '';
    const callbackUrl = req.body.callbackUrl;
    if (!script || !callbackUrl) {
      res.status(400);
      cleanup();
    } else {
      if (!fs.existsSync(script)) {
        res.status(404);
        cleanup();
      } else {
        const jobDetails = {
          input, callbackUrl, script
        };
        queue.createJob(jobDetails).then((job) => {
          res.status(201);
          res.send({
            jobDetails,
            id: job.id,
          });
        }).catch(e => {
          res.status(500);
          console.log('error during job creation');
          console.log(e);
        }).finally(() => {
          cleanup();
        });
      }
    }
  })
  .listen(PORT, () => console.log(`Listening on ${ PORT }`));
  
  queue.jobQueue.process(1, (job, done) => {
    if (shouldDebug) {
      console.log('handling job with id: ' + job.id);
      console.log('job data: ', job.data);
    }
    
    const {input, callbackUrl, script} = job.data;
    run(script, input, shouldDebug, true).then((dataToShow) => {
      const tinyConfig = {url:callbackUrl, data:dataToShow};
      tiny.post(tinyConfig, function posted(err, _result) {
        if (err) {
          console.log('Had an error posting: ', err);
        }
        else if (shouldDebug) {
          console.log('sent data');
        }
        done();
      });
    });
  });

} else {
  const exportAs = require('./exportAs');
  if (process.argv.length < 3) {
    throw new Error('Expected at least 1 arguments: script.fscript "input"');
  }
  console.log('Executing command');
  const script = actualArgs[2];
  const input = actualArgs[3] || '';
  const output = actualArgs[4] || '';

  (async () => {
    run(script, input, shouldDebug, true).then((dataToShow) => {
      if (output !== '') {
        console.log('Attempting to save: ' + output);
        if (output.endsWith('.json')) {
          exportAs.jsonFile(output, dataToShow);
        } else if (output.endsWith('.csv')) {
          exportAs.csvFile(output, dataToShow);
        } else {
          console.log('Unsupported export format');
        }
      } else {
        console.log('----Will not save------');
        console.log(dataToShow);
        console.log('No output saved');
      }
    });
  })();
}
