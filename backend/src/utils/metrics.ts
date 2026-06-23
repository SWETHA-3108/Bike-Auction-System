import client from 'prom-client';

const register = new client.Registry();
client.collectDefaultMetrics({ register });

export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

export const bidsAcceptedTotal = new client.Counter({
  name: 'bids_accepted_total',
  help: 'Total accepted bids',
  registers: [register],
});

export const bidsRejectedTotal = new client.Counter({
  name: 'bids_rejected_total',
  help: 'Total rejected bids',
  labelNames: ['reason'],
  registers: [register],
});

export const activeSocketConnections = new client.Gauge({
  name: 'active_socket_connections',
  help: 'Active Socket.IO connections',
  registers: [register],
});

export const auctionLiveCount = new client.Gauge({
  name: 'auction_live_count',
  help: 'Number of live auctions',
  registers: [register],
});

export { register };
