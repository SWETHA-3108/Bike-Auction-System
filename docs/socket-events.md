# Socket.IO Real-Time Events

Connect to: `http://localhost:3001` (same host as API)

## Authentication

Pass JWT access token in handshake:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: { token: 'YOUR_ACCESS_TOKEN' },
  transports: ['websocket'],
});
```

Anonymous connections are allowed for public auction viewing (no `user:*` room).

## Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join:auction` | `auctionId` string | Join auction room; receive `auction:snapshot` |
| `leave:auction` | `auctionId` string | Leave auction room |
| `join:live` | — | Join global live auctions ticker room |
| `leave:live` | — | Leave live ticker room |

**Bids are NOT placed via socket** — use `POST /v1/auctions/:id/bids`.

## Server → Client

| Event | Room | Description |
|-------|------|-------------|
| `auction:snapshot` | direct to socket | Full live state on join |
| `bid:update` | `auction:{id}` | New bid accepted (masked bidder) |
| `auction:extended` | `auction:{id}` | Soft-close extension |
| `auction:ended` | `auction:{id}` | Auction finished |
| `auction:started` | `auctions:live` | New live auction |
| `notification:new` | `user:{id}` | Private notification |
| `admin:auction:stats` | `admin:auctions` | Admin live monitor |

## Rooms

| Room | Members |
|------|---------|
| `auction:{auctionId}` | Auction detail viewers |
| `user:{userId}` | Authenticated user (private) |
| `admin:auctions` | Admin users |
| `auctions:live` | Homepage live ticker |

## Quick browser test

1. Login via API and copy `accessToken`
2. Open browser devtools on any page, paste (install socket.io client via frontend in Phase 7):

```javascript
// Or use socket.io-client from CDN in an HTML file
```

## Architecture notes

- **Redis adapter** — scales Socket.IO across multiple API instances
- **Redis relay** — worker process publishes events to API via `socket:relay` channel
- **Notification bridge** — worker notifications reach clients via `notifications:emit` channel
