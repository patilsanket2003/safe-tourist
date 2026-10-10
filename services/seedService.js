const Authority = require('../models/Authority');
const Tourist = require('../models/Tourist');
const { DangerZone } = require('../models/Geofence');
const { syncCollegeZoneToDatabase, getCollegeZone } = require('./geofenceEngineService');
const { encrypt } = require('../utils/encrypt');

/**
 * Seed initial data for smooth college demonstration
 */
async function seedInitialData() {
  try {
    // 1. Ensure College Demonstration Restricted Zone exists in DangerZone collection
    await syncCollegeZoneToDatabase();

    // 2. Ensure at least one Authority user exists for dashboard login
    const authorityCount = await Authority.countDocuments();
    if (authorityCount === 0) {
      console.log('🌱 Seeding default Authority Admin user...');
      const admin = new Authority({
        username: 'damini',
        fullName: 'Damini Command Center Admin',
        email: 'damini2004@gmail.com',
        password: 'damini@2004', // Will be hashed by pre-save hook
        role: 'System Administrator',
        authorityId: 'AUTH-HQ-01',
        isActive: true
      });
      await admin.save();
      console.log('✅ Default Authority created: damini2004@gmail.com / damini@2004');
    }

    // 3. Ensure a demonstration tourist exists
    const touristCount = await Tourist.countDocuments();
    if (touristCount === 0) {
      console.log('🌱 Seeding demonstration tourist (T001)...');
      const collegeZone = getCollegeZone();
      const bcrypt = require('bcryptjs');
      const crypto = require('crypto');
      const passwordHash = await bcrypt.hash('tourist123', 10);
      const govIdHash = crypto.createHash('sha256').update('DEMO_GOV_ID_12345').digest('hex');

      const demoTourist = new Tourist({
        touristId: 'T001',
        nameEncrypted: encrypt('Demo Tourist'),
        email: 'tourist@safetrail.com',
        phoneEncrypted: encrypt('+919876543210'),
        govIdHash: govIdHash,
        passwordHash: passwordHash,
        role: 'solo',
        safetyScore: 85,
        location: {
          type: 'Point',
          coordinates: [collegeZone.longitude + 0.002, collegeZone.latitude + 0.002] // Slightly outside demo zone
        },
        currentCity: 'Campus Area',
        isActive: true
      });
      await demoTourist.save();
      console.log('✅ Demonstration tourist created: T001 (email: tourist@safetrail.com / pass: tourist123)');
    }

  } catch (err) {
    console.warn('⚠️ Seeding note:', err.message);
  }
}

module.exports = { seedInitialData };
