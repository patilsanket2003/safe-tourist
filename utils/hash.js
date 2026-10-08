const crypto = require("crypto");

exports.sha256Hex = (input) => {
  return crypto.createHash("sha256").update(input).digest("hex");
};
