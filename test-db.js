const mongoose = require('mongoose');
const { DangerZone } = require('./models/Geofence');

async function run() {
  await mongoose.connect('mongodb://localhost:27017/tourist-safety');
  try {
    const dangerZones = await DangerZone.find({
      'coords.0': {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: [72.8777, 19.076] },
          $maxDistance: 5000
        }
      }
    });
    console.log(dangerZones);
  } catch (err) {
    console.error("ERROR:", err);
  }
  mongoose.disconnect();
}
run();
