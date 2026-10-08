// const getArcjet = require("../config/arcjet");
// const { ARCJET_KEY } = require("../config/config");
// const { NODE_ENV } = require("../config/config");

// const isDevMode = NODE_ENV === "development";

// let registerAj = null;
// let loginAj = null;
// let sosAj = null;
// let generalAj = null;

// const initRegisterAj = async () => {
//     if (registerAj) return registerAj;

//     const { arcjet, tokenBucket, detectBot, shield } = await getArcjet();

//     registerAj = arcjet({
//         key: ARCJET_KEY,
//         characteristics: ["ip.src"],   // pre-auth
//         rules: [
//             tokenBucket({
//                 mode: "LIVE",
//                 refillRate: 1,         // 3 attempts
//                 interval: 60,          // per minute
//                 capacity: 3,           // max burst
//             }),
//             detectBot({
//                 mode: "LIVE", allow: isDevMode
//                     ? [
//                         "CATEGORY:SEARCH_ENGINE",
//                         "CATEGORY:TOOL",        // ✅ allows Postman, curl, etc.
//                         "CATEGORY:MONITOR",
//                     ] : [
//                         "CATEGORY:SEARCH_ENGINE"
//                     ]
//             }),
//             shield({ mode: isDevMode ? "DRY_RUN" : "LIVE" }),
//         ],
//     });

//     return registerAj;
// };

// const initLoginAj = async () => {
//     if (loginAj) return loginAj;

//     const { arcjet, tokenBucket, detectBot, shield } = await getArcjet();

//     loginAj = arcjet({
//         key: ARCJET_KEY,
//         characteristics: ["ip.src"],   // pre-auth
//         rules: [
//             tokenBucket({
//                 mode: "LIVE",
//                 refillRate: 5,         // 5 attempts
//                 interval: 60,          // per minute
//                 capacity: 10,          // slight burst allowed
//             }),
//             detectBot({
//                 mode: "LIVE", allow: isDevMode
//                     ? [
//                         "CATEGORY:SEARCH_ENGINE",
//                         "CATEGORY:TOOL",        // ✅ allows Postman, curl, etc.
//                         "CATEGORY:MONITOR",
//                     ] : [
//                         "CATEGORY:SEARCH_ENGINE"
//                     ]
//             }),
//             shield({ mode: isDevMode ? "DRY_RUN" : "LIVE" }),
//         ],
//     });

//     return loginAj;
// };

// const initSosAj = async () => {
//     if (sosAj) return sosAj;

//     const { arcjet, tokenBucket, detectBot, shield } = await getArcjet();

//     sosAj = arcjet({
//         key: ARCJET_KEY,
//         characteristics: ["userId"],
//         rules: [
//             tokenBucket({
//                 mode: "LIVE",
//                 refillRate: 2,
//                 interval: 180,         // 2 per 3 minutes
//                 capacity: 5,
//             }),
//             detectBot({
//                 mode: "LIVE", allow: isDevMode
//                     ? [
//                         "CATEGORY:SEARCH_ENGINE",
//                         "CATEGORY:TOOL",        // ✅ allows Postman, curl, etc.
//                         "CATEGORY:MONITOR",
//                     ] : []
//             }),
//             shield({ mode: isDevMode ? "DRY_RUN" : "LIVE" }),
//         ],
//     });

//     return sosAj;
// };

// const initGeneralAj = async () => {
//     if (generalAj) return generalAj;

//     const { arcjet, tokenBucket, detectBot, shield } = await getArcjet();

//     generalAj = arcjet({
//         key: ARCJET_KEY,
//         characteristics: ["userId", "ip.src"],
//         rules: [
//             tokenBucket({
//                 mode: "LIVE",
//                 refillRate: 30,        // 30 per minute
//                 interval: 60,
//                 capacity: 60,          // burst = 2x refillRate, not 100
//             }),
//             detectBot({
//                 mode: "LIVE", allow: isDevMode
//                     ? [
//                         "CATEGORY:SEARCH_ENGINE",
//                         "CATEGORY:TOOL",        // ✅ allows Postman, curl, etc.
//                         "CATEGORY:MONITOR",
//                     ] : [
//                         "CATEGORY:SEARCH_ENGINE"
//                     ]
//             }),
//             shield({ mode: isDevMode ? "DRY_RUN" : "LIVE" }),
//         ],
//     });

//     return generalAj;
// };

// // ✅ register
// const arcjetRegisterMiddleware = async (req, res, next) => {
//     try {
//         const aj = await initRegisterAj();

//         const ip =
//             req.ip ||
//             req.headers["x-forwarded-for"]?.split(",")[0] ||
//             req.socket?.remoteAddress ||
//             "127.0.0.1";

//         const decision = await aj.protect(req, { requested: 1 });

//         if (decision.isDenied()) {
//             if (decision.reason.isRateLimit())
//                 return res.status(429).json({ error: "Too many registration attempts. Try again later." });
//             if (decision.reason.isBot())
//                 return res.status(403).json({ error: "Bot Detected" });

//             return res.status(403).json({ error: "Access Denied" });
//         }
//         next();
//     } catch (error) {
//         console.log(`Arcjet Register Middleware error : ${error}`);
//         next(error);
//     }
// };

// // ✅ login
// const arcjetLoginMiddleware = async (req, res, next) => {
//     try {
//         const aj = await initLoginAj();

//         const ip =
//             req.ip ||
//             req.headers["x-forwarded-for"]?.split(",")[0] ||
//             req.socket?.remoteAddress ||
//             "127.0.0.1";

//         const decision = await aj.protect(req, { requested: 1 });

//         if (decision.isDenied()) {
//             if (decision.reason.isRateLimit())
//                 return res.status(429).json({ error: "Too many login attempts. Try again later." });
//             if (decision.reason.isBot())
//                 return res.status(403).json({ error: "Bot Detected" });

//             return res.status(403).json({ error: "Access Denied" });
//         }
//         next();
//     } catch (error) {
//         console.log(`Arcjet Login Middleware error : ${error}`);
//         next(error);
//     }
// };

// // ✅ sos
// const arcjetSosMiddleware = async (req, res, next) => {
//     try {
//         const aj = await initSosAj();
//         const decision = await aj.protect(req, {
//             requested: 1,
//             userId: req.user.id,
//         });

//         if (decision.isDenied()) {
//             if (decision.reason.isRateLimit())
//                 return res.status(429).json({
//                     error: "SOS Rate Limit Exceeded",
//                     message: "Your SOS is already being handled. Please wait 5 minutes before sending another.",
//                     retryAfter: decision.reason.resetTime,
//                 });

//             return res.status(403).json({ error: "Access Denied" });
//         }
//         next();
//     } catch (error) {
//         console.log(`Arcjet SOS Middleware error : ${error}`);
//         next(error);
//     }
// };

// // ✅ general
// const arcjetGeneralMiddleware = async (req, res, next) => {
//     try {
//         const aj = await initGeneralAj();

//         const ip =
//             req.ip ||
//             req.headers["x-forwarded-for"]?.split(",")[0] ||
//             req.socket?.remoteAddress ||
//             "127.0.0.1";

//         const decision = await aj.protect(req, {
//             requested: 1,
//             userId: req.user?.id ?? req.ip,
//         });

//         if (decision.isDenied()) {
//             if (decision.reason.isRateLimit())
//                 return res.status(429).json({ error: "Rate Limit Exceeded" });
//             if (decision.reason.isBot())
//                 return res.status(403).json({ error: "Bot Detected" });

//             return res.status(403).json({ error: "Access Denied" });
//         }
//         next();
//     } catch (error) {
//         console.log(`Arcjet General Middleware error : ${error}`);
//         next(error);
//     }
// };

// module.exports = {
//     arcjetRegisterMiddleware,
//     arcjetLoginMiddleware,
//     arcjetSosMiddleware,
//     arcjetGeneralMiddleware,
// };