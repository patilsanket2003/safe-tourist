const http = require('http');
const httpProxy = require('http-proxy');

const proxy = httpProxy.createProxyServer({
  ws: true,
  changeOrigin: true
});

const FRONTEND_TARGET = 'http://localhost:8081';
const BACKEND_TARGET = 'http://localhost:5001';

proxy.on('error', (err, req, res) => {
  if (res && res.writeHead && !res.headersSent) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Gateway Target Unavailable', details: err.message }));
  }
});

const server = http.createServer((req, res) => {
  // Pass socket.io and API calls to backend
  if (req.url.startsWith('/api') || req.url.startsWith('/socket.io')) {
    proxy.web(req, res, { target: BACKEND_TARGET });
  } else {
    // Pass web app and bundle assets to Expo frontend
    proxy.web(req, res, { target: FRONTEND_TARGET });
  }
});

// Support WebSocket upgrades for Socket.io and Metro bundler HMR
server.on('upgrade', (req, socket, head) => {
  if (req.url.startsWith('/socket.io')) {
    proxy.ws(req, socket, head, { target: BACKEND_TARGET });
  } else {
    proxy.ws(req, socket, head, { target: FRONTEND_TARGET });
  }
});

const PORT = process.env.TUNNEL_PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Unified Proxy Gateway active on port ${PORT}`);
  console.log(`   → Routing /api & /socket.io to Backend (5001)`);
  console.log(`   → Routing all Web Traffic to Frontend (8081)`);
});
