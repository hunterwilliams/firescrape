const Queue = require('bee-queue');
const config = require('./config');

const QUEUE_NAME = config.QUEUE_NAME;
const options = config.options;

const jobQueue = new Queue(QUEUE_NAME, options);

const createJob = (job) => {
  return jobQueue.createJob(job).save();
};

module.exports.createJob = createJob;
module.exports.jobQueue = jobQueue;