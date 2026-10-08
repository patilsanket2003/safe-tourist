const mongoose = require('mongoose');
const {MONGO_URI} = require('./config');

// Global variable to cache the connection for Serverless/Vercel environments
let isConnected = false; 

const connectDB = async () => {
  // 1. If already connected, reuse the connection
  if (isConnected) {
    console.log('=> Using existing database connection');
    return;
  }

  // 2. Check current mongoose state (0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting)
  if (mongoose.connection.readyState === 1) {
      console.log('=> Mongoose already connected');
      isConnected = true;
      return;
  }

  try {
    // 3. Create new connection
    const db = await mongoose.connect(MONGO_URI, {
      // Serverless Best Practice: Fail fast if no connection, don't buffer
      bufferCommands: false, 
    });

    isConnected = db.connections[0].readyState;
    console.log('MongoDB connected successfully!');
  } catch (error) {
    console.error('Database connection error:', error);
    // Do not process.exit(1) in serverless environments, just throw
    throw error;
  }
};

module.exports = connectDB;