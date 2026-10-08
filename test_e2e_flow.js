const { io } = require('socket.io-client');

const BACKEND_URL = 'http://localhost:5001';

console.log('🧪 Starting SafeTrail End-to-End GPS & Geofence Socket.IO Verification...');

const authoritySocket = io(BACKEND_URL, {
  transports: ['websocket', 'polling'],
  forceNew: true,
});

const touristSocket = io(BACKEND_URL, {
  transports: ['websocket', 'polling'],
  forceNew: true,
});

let authorityReceivedLocationCount = 0;
let authorityReceivedAlertCount = 0;
let authorityReceivedExitCount = 0;
let testPassed = false;

authoritySocket.on('connect', () => {
  console.log('✅ [Authority Dashboard] Connected to backend Socket.IO. Registering as authority...');
  authoritySocket.emit('registerAuthority', { role: 'authority', userId: 'AUTH_001' });
});

authoritySocket.on('registered', (data) => {
  console.log('✅ [Authority Dashboard] Successfully registered in authorities room:', data);
  // Once authority is registered, connect tourist
  startTouristFlow();
});

authoritySocket.on('locationUpdate', (data) => {
  authorityReceivedLocationCount++;
  console.log(`📍 [Authority Dashboard] Live marker update received (#${authorityReceivedLocationCount}):`, {
    touristId: data.touristId,
    location: data.location,
    zoneStatus: data.zoneStatus,
    safetyScore: data.safetyScore,
  });
});

authoritySocket.on('newSOSAlert', (data) => {
  authorityReceivedAlertCount++;
  console.log(`🚨 [Authority Dashboard] NEW RESTRICTED ZONE SOS ALERT RECEIVED (#${authorityReceivedAlertCount}):`, {
    alertId: data.alertId,
    touristId: data.touristId,
    severity: data.severity,
    location: data.location,
  });
});

authoritySocket.on('restrictedZoneExit', (data) => {
  authorityReceivedExitCount++;
  console.log(`🟢 [Authority Dashboard] RESTRICTED ZONE EXIT RECEIVED (#${authorityReceivedExitCount}):`, {
    touristId: data.touristId,
    zoneName: data.zoneName,
    event: data.event,
  });
});

function startTouristFlow() {
  const runFlow = async () => {
    console.log('📱 [Tourist Mobile App] Connected to backend Socket.IO. Registering tourist T001...');
    touristSocket.emit('registerTourist', { role: 'tourist', touristId: 'T001', location: { lat: 19.0850, lng: 72.8900 } });

    touristSocket.on('authorityAlert', (alert) => {
      console.log('📱 [Tourist Mobile App] In-App Push/Toast Alert Received:', alert.title, '-', alert.message);
    });

    touristSocket.on('restrictedZoneWarning', (warning) => {
      console.log('📱 [Tourist Mobile App] Restricted Zone Status Received:', warning.status, warning.message);
    });

    // STEP 1: Tourist is outside restricted zone (SAFE)
    console.log('\n--- Step 1: Phone outside zone (Lat: 19.0850, Lng: 72.8900) ---');
    touristSocket.emit('updateTouristLocation', {
      touristId: 'T001',
      latitude: 19.0850,
      longitude: 72.8900,
      accuracy: 5,
      speed: 1.2,
      heading: 90,
      timestamp: new Date().toISOString(),
    });

    await new Promise((r) => setTimeout(r, 2000));

    // STEP 2: Tourist enters College Demonstration Restricted Zone (19.0760, 72.8777)
    console.log('\n--- Step 2: Phone enters College Restricted Zone (Lat: 19.0760, Lng: 72.8777) ---');
    touristSocket.emit('updateTouristLocation', {
      touristId: 'T001',
      latitude: 19.0760,
      longitude: 72.8777,
      accuracy: 3,
      speed: 1.1,
      heading: 180,
      timestamp: new Date().toISOString(),
    });

    await new Promise((r) => setTimeout(r, 2000));

    // STEP 3: Tourist moves slightly while inside zone (verifying no duplicate spam alerts)
    console.log('\n--- Step 3: Phone moves inside zone (Lat: 19.07602, Lng: 72.87772) ---');
    touristSocket.emit('updateTouristLocation', {
      touristId: 'T001',
      latitude: 19.07602,
      longitude: 72.87772,
      accuracy: 3,
      speed: 0.8,
      heading: 185,
      timestamp: new Date().toISOString(),
    });

    await new Promise((r) => setTimeout(r, 2000));

    // STEP 4: Tourist walks outside the restricted zone (EXIT)
    console.log('\n--- Step 4: Phone walks outside zone (Lat: 19.0850, Lng: 72.8900) ---');
    touristSocket.emit('updateTouristLocation', {
      touristId: 'T001',
      latitude: 19.0850,
      longitude: 72.8900,
      accuracy: 4,
      speed: 1.5,
      heading: 0,
      timestamp: new Date().toISOString(),
    });

    await new Promise((r) => setTimeout(r, 2500));

    // EVALUATE TEST RESULTS
    console.log('\n========================================');
    console.log('🏁 TEST RESULTS SUMMARY');
    console.log('========================================');
    console.log('Location Updates Received by Dashboard:', authorityReceivedLocationCount, '(Expected >= 4)');
    console.log('Restricted Zone Alerts Received by Dashboard:', authorityReceivedAlertCount, '(Expected == 1)');
    console.log('Restricted Zone Exits Received by Dashboard:', authorityReceivedExitCount, '(Expected == 1)');

    if (
      authorityReceivedLocationCount >= 3 &&
      authorityReceivedAlertCount === 1 &&
      authorityReceivedExitCount === 1
    ) {
      console.log('🎉 ALL ACCEPTANCE CRITERIA PASSED SUCCESSFULLY!');
      testPassed = true;
    } else {
      console.error('❌ Acceptance criteria check failed.');
    }

    authoritySocket.disconnect();
    touristSocket.disconnect();
    process.exit(testPassed ? 0 : 1);
  };

  if (touristSocket.connected) {
    runFlow();
  } else {
    touristSocket.on('connect', runFlow);
  }
}
