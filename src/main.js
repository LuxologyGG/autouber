require('dotenv').config();
const http = require('http');

const TRIGGER_SECRET = process.env.TRIGGER_SECRET;
const WEBHOOK_PORT = process.env.WEBHOOK_PORT || 3000;

// Webhook server — receives orders from the Cloudflare Worker and runs Camoufox locally.
// The Discord bot (bot.js) is not needed here; the Worker handles all Discord interactions.
const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/order') {
    res.writeHead(404).end();
    return;
  }

  const auth = req.headers['x-trigger-secret'];
  if (!TRIGGER_SECRET || auth !== TRIGGER_SECRET) {
    res.writeHead(401).end('Unauthorized');
    return;
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
      const { restaurant, address, items } = JSON.parse(body);
      res.writeHead(202).end(JSON.stringify({ queued: true }));
      const { runOrder } = require('./playwright-script');
      const result = await runOrder({ restaurant, address, items });
      console.log('[order result]', result);
    } catch (err) {
      console.error('[order error]', err.message);
    }
  });
});

server.listen(WEBHOOK_PORT, () => {
  console.log(`AutoUber ready — listening on http://localhost:${WEBHOOK_PORT}/order`);
});
