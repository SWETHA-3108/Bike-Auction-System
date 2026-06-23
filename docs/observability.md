# Observability Guide

## Health Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Liveness — process is running |
| `GET /health/ready` | Readiness — MongoDB + Redis connected |

Use these for load balancer and Kubernetes probes.

## Metrics

Prometheus scrape endpoint: `GET /metrics`

| Metric | Type | Description |
|--------|------|-------------|
| `http_request_duration_seconds` | Histogram | API latency by route |
| `bids_accepted_total` | Counter | Accepted bids |
| `bids_rejected_total` | Counter | Rejected bids (by reason) |
| `active_socket_connections` | Gauge | Socket.IO connections |
| `auction_live_count` | Gauge | Live auctions |

Default Node.js metrics (memory, CPU, event loop) are also exported via `prom-client`.

## Logging

Structured JSON logs via Winston. Each HTTP request includes:

- `requestId`
- `method`, `url`, `status`
- `durationMs`
- `userId` (when authenticated)

Set `LOG_LEVEL=debug` for socket join/leave diagnostics in development.

## CI Pipeline

GitHub Actions workflow (`.github/workflows/ci.yml`):

1. **Backend**: typecheck → lint → unit tests → integration tests (Mongo + Redis) → build
2. **Frontend**: typecheck → production build

### Run tests locally

Requires MongoDB and Redis (Atlas/Upstash or local):

```bash
cd backend
npm run test:unit
npm run test:integration
npm run lint
```

Integration tests use database `bike_auction_test` and flush Redis between cases.

## Alerting suggestions (production)

- `health/ready` failing for > 1 minute
- `bids_rejected_total` spike with zero `bids_accepted_total` during live auctions
- API p95 latency > 500ms on bid endpoint
- `active_socket_connections` drops to zero unexpectedly

## Future enhancements

- OpenTelemetry distributed tracing
- Redis vs Mongo reconciliation cron for ended auctions
- Grafana dashboards for business KPIs
