const mongoose = require('mongoose');
const GlobalHazard = require('./models/GlobalHazard');

async function injectHazards() {
  await mongoose.connect('mongodb://127.0.0.1:27017/tourist-safety');

  const hazards = [
    {
      source_id: 'test-fire-mumbai',
      name: 'Mumbai Suburb Brush Fire',
      type: 'forest fire',
      severity: 'Critical',
      geometry: { type: 'Point', coordinates: [72.8777, 19.0760] },
      source: 'TEST',
      description: 'Test fire for siren testing',
      active: true
    },
    {
      source_id: 'test-hilly-mumbai',
      name: 'Sanjay Gandhi Steep Terrain',
      type: 'landslide',
      severity: 'High',
      geometry: { type: 'Point', coordinates: [72.9100, 19.2100] },
      source: 'TEST',
      description: 'Hilly steep area',
      active: true
    }
  ];

  for (const h of hazards) {
    await GlobalHazard.updateOne(
      { source_id: h.source_id },
      { $set: h },
      { upsert: true }
    );
  }

  console.log('Injected test hazards in Mumbai for visibility testing.');
  mongoose.disconnect();
}
injectHazards();
