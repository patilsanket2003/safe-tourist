// // config/arcjet.js
// let ajInstance = null;

// const getArcjet = async () => {
//   if (ajInstance) return ajInstance;

//   const { default: arcjet, shield, detectBot, tokenBucket } = await import("@arcjet/node");

//   ajInstance = { arcjet, shield, detectBot, tokenBucket };
//   return ajInstance;
// };

// module.exports = getArcjet;