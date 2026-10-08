import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ToastProvider from './components/ToastProvider';
import './index.css';
import 'leaflet/dist/leaflet.css';

// Note: StrictMode is intentionally omitted because react-map-gl/Mapbox GL JS
// does not support React 18's double-invocation of effects in development mode.
// StrictMode causes removeSource to be called on an already-cleaned-up source,
// throwing: "Cannot read properties of undefined (reading 'get')"
createRoot(document.getElementById('root')!).render(
  <ToastProvider>
    <App />
  </ToastProvider>
);
