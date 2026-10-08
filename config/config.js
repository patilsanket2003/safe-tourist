const { config } = require("dotenv");

config({ path: `.env` });

module.exports = {
  PORT: process.env.PORT || 5001,
  NODE_ENV: process.env.NODE_ENV || "development",
  MONGO_URI: process.env.MONGO_URI || process.env.DB_URL || "mongodb://localhost:27017/tourist-safety",
  JWT_SECRET: process.env.JWT_SECRET || "safetrail_jwt_secret_college_demo_2026",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  POLYGON_RPC: process.env.POLYGON_RPC || "https://polygon-rpc.com",
  SMART_CONTRACT_ADDRESS: process.env.SMART_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000",
  SMART_CONTRACT_ADDRESS_reg: process.env.SMART_CONTRACT_ADDRESS_reg || "0x0000000000000000000000000000000000000000",
  SMART_CONTRACT_ADDRESS_sos: process.env.SMART_CONTRACT_ADDRESS_sos || "0x0000000000000000000000000000000000000000",
  PRIVATE_KEY: process.env.PRIVATE_KEY || "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  SERVER_URL: process.env.SERVER_URL || "http://localhost:5001",
  GOVID_SALT: process.env.GOVID_SALT || "0123456789abcdef0123456789abcdef",
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  MAPBOX_ACCESS_TOKEN: process.env.MAPBOX_ACCESS_TOKEN || "",
  RESEND_API_KEY: process.env.RESEND_API_KEY || "",
  FROM_EMAIL: process.env.FROM_EMAIL || "safety@safetrail.com",
  REDIS_PORT: process.env.REDIS_PORT || 6379,
  REDIS_HOST: process.env.REDIS_HOST || "localhost",
  ARCJET_KEY: process.env.ARCJET_KEY || "",
  COLLEGE_ZONE_ENABLED: process.env.COLLEGE_ZONE_ENABLED !== "false",
  COLLEGE_ZONE_NAME: process.env.COLLEGE_ZONE_NAME || "College Restricted Area",
  COLLEGE_ZONE_LAT: parseFloat(process.env.COLLEGE_ZONE_LAT || "19.0760"),
  COLLEGE_ZONE_LNG: parseFloat(process.env.COLLEGE_ZONE_LNG || "72.8777"),
  COLLEGE_ZONE_RADIUS: parseFloat(process.env.COLLEGE_ZONE_RADIUS || "80"),
  COLLEGE_ZONE_RISK_LEVEL: process.env.COLLEGE_ZONE_RISK_LEVEL || "High",
  COLLEGE_ZONE_ALERT_MSG: process.env.COLLEGE_ZONE_ALERT_MSG || "RESTRICTED ZONE ALERT: Tourist has entered the College Restricted Area!"
};

