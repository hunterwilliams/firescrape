const QUEUE_NAME = 'scrapejobs';

const options = {
  removeOnSuccess: true,
  redis: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
  },
}

module.exports.QUEUE_NAME = QUEUE_NAME;
module.exports.options = options;