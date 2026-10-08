const mongoose = require('mongoose');
const hazardImporter = require('./services/hazardDataImporter');

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/tourist-safety');
  await hazardImporter.importOSMRestrictedAndProtected();
  console.log('Done pulling OSM for India.');
  mongoose.disconnect();
}
run();
