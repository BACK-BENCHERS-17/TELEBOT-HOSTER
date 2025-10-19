import http from 'http';

const ALIVE_URL = process.env.REPLIT_DEV_DOMAIN 
  ? `https://${process.env.REPLIT_DEV_DOMAIN}/api/alive`
  : 'http://localhost:5000/api/alive';

const PING_INTERVAL = 5 * 60 * 1000; // 5 minutes

function pingServer() {
  const url = new URL(ALIVE_URL);
  
  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname,
    method: 'GET',
    headers: {
      'User-Agent': 'KeepAlive/1.0'
    }
  };

  const protocol = url.protocol === 'https:' ? require('https') : http;
  
  const req = protocol.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log(`[Keep-Alive] Ping successful - Status: ${res.statusCode}`);
      try {
        const json = JSON.parse(data);
        console.log(`[Keep-Alive] Uptime: ${Math.floor(json.uptime / 60)}m`);
      } catch (e) {
        // Ignore parse errors
      }
    });
  });

  req.on('error', (error) => {
    console.error(`[Keep-Alive] Ping failed:`, error.message);
  });

  req.end();
}

// Start keep-alive pings
console.log('[Keep-Alive] Starting self-ping service...');
console.log(`[Keep-Alive] Target URL: ${ALIVE_URL}`);
console.log(`[Keep-Alive] Interval: ${PING_INTERVAL / 1000}s`);

// Initial ping after 30 seconds
setTimeout(pingServer, 30000);

// Regular pings
setInterval(pingServer, PING_INTERVAL);

console.log('[Keep-Alive] Service started successfully');
