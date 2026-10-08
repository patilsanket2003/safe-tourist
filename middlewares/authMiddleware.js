const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/config");

// Verify JWT token middleware
function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(403).json({ message: "No token provided" });

  const token = authHeader.split(" ")[1]; // Expect "Bearer <token>"
  if (!token) return res.status(401).json({ message: "Invalid token format" });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: "Unauthorized" });
    req.user = decoded; // Save decoded payload
    next();
  });
}

// Role-based middlewares
function isSolo(req, res, next) {
  if (req.user?.role === "solo") return next();
  res.status(403).json({ message: "Requires solo role" });
}

// Middleware to ensure only tour-admins can access certain group management routes
function isTourAdmin(req, res, next) {
  if (req.user?.role === "tour-admin") {
    return next();
  }
  res.status(403).json({ 
    message: "Access denied. Only tour administrators can perform this action." 
  });
}

function isAuthority(req, res, next) {
  const allowedRoles = [
    "Police Officer",
    "Tourism Officer",
    "Emergency Responder",
    "Admin",
    "System Administrator",
    "authority",
    "admin"
  ];
  if (
    allowedRoles.includes(req.user?.role) ||
    (req.user?.role && req.user.role.toLowerCase().includes("admin"))
  ) {
    return next();
  }
  res.status(403).json({ message: "Requires Authority role" });
}

module.exports = { verifyToken, isSolo, isTourAdmin, isAuthority };
