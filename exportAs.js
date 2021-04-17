const fs = require('fs');
const csvWriter = require('csv-write-stream');

function logSave(filename) {
  console.log("Saved as: " + filename);
}

function csvFile(filename, data) {
  const stream = fs.createWriteStream(filename);
  const writer = csvWriter({sendHeaders: false});
  
  stream.write(Buffer.from('EFBBBF', 'hex'));
  writer.pipe(stream);

  if (data.length > 0) {
    const keys = Object.keys(data[0]);
    let obj = {};
    for (let i = 0; i < keys.length; i += 1) {
      obj[keys[i]] = keys[i];
    }
    writer.write(obj);
  }

  for (let j = 0; j < data.length; j += 1) {
    writer.write(data[j]);
  }
  writer.end();
  stream.end();
  logSave(filename);
}

function jsonFile(filename, data) {
  fs.writeFile(filename, JSON.stringify(data), function (err) {
    if (err) throw err;
    logSave(filename);
  });
}

exports.csvFile = csvFile;
exports.jsonFile = jsonFile;