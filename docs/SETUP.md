# Setup Guide

Step-by-step instructions for running the Bike Auction Platform locally or against cloud databases.

## Option A — MongoDB Atlas + Upstash (no Docker)

Best match for production-like development without installing databases locally.

### 1. MongoDB Atlas

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Create a database user with read/write access.
3. Allow your IP (or `0.0.0.0/0` for development only).
4. Copy the connection string and replace `<password>` and set the database name:

   ```
   mongodb+srv://user:pass@cluster.mongodb.net/bike_auction?retryWrites=true&w=majority
   ```

### 2. Upstash Redis

1. Create a Redis database at [upstash.com](https://upstash.com/).
2. Copy the **TLS** URL (`rediss://...`). The backend enables TLS automatically for `rediss://` URLs.

### 3. Backend configuration

```powershell
cd backend
copy .env.example .env
npm install
```

Set `backend/.env`:

```env
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb+srv://...
REDIS_URL=rediss://default:...@....upstash.io:6379
JWT_ACCESS_SECRET=<32+ random chars>
JWT_REFRESH_SECRET=<32+ random chars>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=info
```

### 4. Run processes

You need **two** backend processes:

| Process | Command | Role |
|---------|---------|------|
| API | `npm run dev` | HTTP, Socket.IO, bid handling |
| Worker | `npm run worker` | Auction start/end, notifications |

### 5. Seed data

```powershell
npm run seed
```

### 6. Frontend

```powershell
cd ../frontend
copy .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`, log in with `bidder@example.com` / `Bidder123!`, and open a live auction to test bidding.

---

## Option B — Local Mongo + Redis via Docker

```powershell
cd docker
docker compose up -d
```

Use in `backend/.env`:

```env
MONGODB_URI=mongodb://localhost:27017/bike_auction
REDIS_URL=redis://localhost:6379
```

Then follow steps 4–6 from Option A.

---

## Option C — Full stack Docker

Builds API, worker, frontend, Mongo, and Redis:

```powershell
docker compose -f docker/docker-compose.full.yml up --build
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:3001`

Set `JWT_*` secrets via environment or a `.env` file in the `docker/` directory before starting.

---

## Health checks

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Liveness — process is up |
| `GET /health/ready` | Readiness — MongoDB + Redis connected |
| `GET /metrics` | Prometheus metrics |
| `GET /v1` | API version info |

Example:

```powershell
curl http://localhost:3001/health/ready
```

Expected: `{"status":"ok","mongodb":"connected","redis":"connected"}` (field names may vary slightly).

---

## Common issues

### `INTERNAL_ERROR` when placing a bid

Usually Redis `endTime` format. The API stores auction end time as epoch **milliseconds** in Redis. If you see this after manual Redis edits, restart the auction or re-schedule via admin.

### Socket connects but no live updates

1. Confirm the **worker** is running (`npm run worker`).
2. Confirm JWT is sent on socket handshake (frontend does this automatically when logged in).
3. Check browser devtools → Network → WS for `join:auction` and `auction:snapshot` events.

### Upstash `flushdb` in tests

Upstash may block `FLUSHDB`. Integration tests fall back to deleting known key prefixes. Use a dedicated Redis instance for testing if possible.

### CORS errors from frontend

Ensure `CORS_ORIGIN=http://localhost:5173` in `backend/.env` matches your frontend origin exactly (no trailing slash).

### Worker not starting auctions

BullMQ jobs are scheduled when an admin creates/schedules an auction. The worker must be running **before** the scheduled start time. Check logs for `Auction started` / `Auction ended` messages.

### Bike images show "No image"

This usually means your MongoDB was overwritten by **test seed data** (auction titled "Test Live Auction" with no images). Restore demo data:

```powershell
cd backend
npm run seed:restore
```

Then refresh the frontend. Never run E2E/test scripts against your main Atlas database — use a separate `bike_auction_test` database for tests.

---

## Manual API smoke test (PowerShell)

```powershell
# Register
$body = '{"email":"test@example.com","password":"Test123!","displayName":"Test"}'
Invoke-RestMethod -Uri http://localhost:3001/v1/auth/register -Method POST -Body $body -ContentType "application/json"

# Login
$login = Invoke-RestMethod -Uri http://localhost:3001/v1/auth/login -Method POST -Body '{"email":"test@example.com","password":"Test123!"}' -ContentType "application/json"
$token = $login.data.accessToken

# List live auctions
Invoke-RestMethod -Uri http://localhost:3001/v1/auctions/live -Headers @{ Authorization = "Bearer $token" }
```

See [API Contracts](api-contracts.md) for full endpoint reference.
