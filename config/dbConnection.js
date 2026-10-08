const mongoose = require('mongoose');
const {MONGO_URI} = require('./config');

const dns = require('dns');

// On macOS / certain routers, DNS SRV lookups for mongodb+srv fail with querySrv EBADRESP.
// Setting public DNS resolvers (Google 8.8.8.8 and Cloudflare 1.1.1.1) fixes this permanently.
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore in environments where setting DNS servers is restricted
}

// Global variable to cache the connection for Serverless/Vercel environments
let isConnected = false; 

const connectDB = async () => {
  // 1. If already connected, reuse the connection
  if (isConnected && mongoose.connection.readyState === 1) {
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
      bufferCommands: false,
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    });

    isConnected = db.connections[0].readyState === 1;
    console.log('MongoDB connected successfully!');

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection runtime error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Reconnecting automatically when needed...');
      isConnected = false;
    });

  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
};

module.exports = connectDB;