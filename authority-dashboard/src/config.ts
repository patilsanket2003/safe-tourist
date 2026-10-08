export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

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
