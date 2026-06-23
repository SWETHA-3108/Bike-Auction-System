# Assumptions & Trade-offs

Design decisions documented for reviewers and future maintainers.

## Assumptions

### Business & product

- **Motorcycle auctions only** — domain models (make, model, year, mileage) target bikes, not general goods.
- **Single currency** — USD implied; amounts stored as **integer cents** (e.g. `1500000` = $15,000.00).
- **Registered bidders only** — placing bids requires authentication; browsing is public.
- **Admin-managed inventory** — sellers do not self-list; admins create motorcycles and auctions.
- **No payment settlement** — winning a bid ends the auction in software; payment/shipping is out of scope.
- **No email in v1** — notifications are in-app + Socket.IO push; SMTP deferred.
- **No email verification** — acceptable for internship demo; production would verify email before bidding.
- **Single region** — API, worker, Atlas, and Upstash deployed in one region; no multi-region failover.
- **Demo seed users** — admin account created via `npm run seed`; production would use invite-only admin provisioning.

### Technical

- **Node.js 20+** runtime.
- **MongoDB 7** and **Redis 7** compatible APIs.
- **Clock sync** — server clocks assumed reasonably synchronized for auction scheduling (NTP on hosts).
- **Client clocks** — UI shows server-provided timestamps; clients do not authoritatively determine auction end.
- **Trusted admins** — admin role can force-end auctions and modify schedules; audit log captures actions.

---

## Trade-offs

| Decision | Why we chose it | What we gave up |
|----------|-----------------|-----------------|
| **Modular monolith** | Fast delivery, single deploy artifact, clear module folders | Independent scaling per service |
| **MongoDB** | Flexible motorcycle attributes, document model fits auctions + embedded metadata | Strict relational constraints, complex joins |
| **Redis for live bids** | Sub-millisecond atomic updates via Lua; natural fit for rate limits and socket adapter | Extra datastore to operate; reconciliation with MongoDB |
| **HTTP bid writes** | Standard auth, idempotency keys, easy to test and audit | Slightly higher latency than pure WebSocket |
| **Socket push only** | Clear separation of command (HTTP) vs events (WS) | Clients need both transports |
| **BullMQ on Redis** | Reliable delayed jobs for start/end; same Redis as cache | Worker must run as separate process |
| **JWT access + refresh** | Stateless API scaling; familiar pattern | Token revocation requires refresh token store |
| **Express** | Mature middleware ecosystem, team familiarity | Marginally lower throughput vs Fastify |
| **React SPA** | Rich interactive bidding UX | SEO for individual auctions requires extra work (not needed for demo) |
| **Vite + Tailwind** | Fast dev feedback, utility-first styling | Design system consistency is manual |
| **Upstash / Atlas free tiers** | Zero local infra for reviewers | Cold starts, connection limits on free plans |
| **Integration tests over E2E** | Reliable CI against real Mongo/Redis | No browser automation coverage in default CI |

---

## Known limitations (acceptable for v1)

1. **Eventual consistency** — MongoDB bid record may lag Redis by milliseconds after a successful bid.
2. **No bid retraction** — bids are binding once accepted.
3. **No proxy bidding** — max-auto-bid not implemented; manual bid increments only.
4. **Rate limits are per-user** — shared NAT IPs could affect multiple users behind one IP if extended naively.
5. **Worker single point** — one worker process; if it dies, scheduled transitions queue until restart.
6. **No OpenAPI spec** — endpoint contracts documented in [api-contracts.md](api-contracts.md); OpenAPI is a future enhancement.

---

## Alternatives considered

### PostgreSQL instead of MongoDB

Stronger ACID and relational modeling for bids and users. Rejected for v1 because motorcycle attribute flexibility and faster schema iteration favored documents; bid hot path is in Redis regardless.

### Microservices (bid service, auction service, notification service)

Better isolation at scale. Rejected as premature — operational cost outweighs benefits for internship scope.

### Socket-only bidding

Lower perceived latency. Rejected because idempotency, rate limiting, and audit trails are harder to enforce on persistent WebSocket messages.

### Server-Sent Events instead of Socket.IO

Simpler one-way push. Rejected because rooms, bidirectional join/leave, and Redis adapter are well-supported in Socket.IO.

---

## Production hardening (out of scope for assignment)

- Email verification and password reset flows
- Stripe escrow or deposit holds before bidding
- WAF / DDoS protection in front of API
- Redis/MongoDB backups and point-in-time recovery runbooks
- OpenAPI + generated client SDKs
- Playwright E2E suite in CI
- Horizontal pod autoscaling with HPA metrics from `/metrics`
