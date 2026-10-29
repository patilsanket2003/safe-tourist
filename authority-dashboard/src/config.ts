// Always prefer the env var (set VITE_API_BASE_URL in your deployment dashboard).
// If not set and running on localhost → proxy handles /api via vite.config.ts (empty string = relative URL).
// If not set and running on any other host (Vercel, Netlify, Render, custom domain) → use the Render backend.
const hostname =
  typeof window !== "undefined" ? window.location.hostname : "";
const isProxiedHost =
  hostname === "localhost" ||
  hostname === "127.0.0.1" ||
  hostname.endsWith(".trycloudflare.com") ||
  /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) ||
  hostname === "";

const envBase = (import.meta.env.VITE_API_BASE_URL || "").trim();
const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

// When accessed remotely (via Cloudflare tunnel, mobile, LAN, or other device),
// always use relative paths "" so requests route through the Vite proxy to the local backend.
export const API_BASE_URL =
  (!isLocalhost && (envBase.includes("localhost") || envBase.includes("127.0.0.1")))
    ? ""
    : (isProxiedHost ? "" : (envBase || ""));

// Path Deviation backend — deployed on Render
// Previously pointed to localhost:8000 which caused live location sharing to break.
export const PATH_DEVIATION_API_BASE_URL =
  "https://path-deviation.onrender.com/api";

console.info(
  "[Config] API_BASE_URL:",
  API_BASE_URL,
  "\n[Config] PATH_DEVIATION_API_BASE_URL:",
  PATH_DEVIATION_API_BASE_URL,
);
