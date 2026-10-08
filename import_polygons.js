const mongoose = require('mongoose');
const HazardDataImporter = require('./services/hazardDataImporter');

async function run() {
  await mongoose.connect('mongodb+srv://daminipatil264_db_user:nka9KNuulyQsRXWE@cluster0.vhuk0mi.mongodb.net/tourist-safety?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  
  const importer = new HazardDataImporter();
  console.log('Starting OSM protected areas import...');
  await importer.importOSMRestrictedAndProtected();
  console.log('Import finished.');
  
  mongoose.disconnect();
}

run().catch(console.error);
