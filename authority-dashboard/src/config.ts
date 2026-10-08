export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== "undefined" && window.location.hostname.includes("vercel.app")
    ? "https://safe-tourist-backend-ix0g.onrender.com"
    : typeof window !== "undefined"
      ? window.location.origin
      : "https://safe-tourist-backend-ix0g.onrender.com");

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
