const { ethers } = require("ethers");

exports.hex64ToBytes32 = (hex64) => {
  if (!hex64.startsWith("0x")) hex64 = "0x" + hex64;
  if (hex64.length !== 66) throw new Error("invalid sha256 hex length");
  return ethers.getBytes(hex64); // returns Uint8Array of 32 bytes
};
