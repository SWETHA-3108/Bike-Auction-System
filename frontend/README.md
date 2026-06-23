# Bike Auction Frontend

React + Vite + Tailwind SPA for live motorcycle auctions.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

Open **http://localhost:5173**

Ensure the backend API runs on **http://localhost:3001**.

## Features

- Browse live & upcoming auctions
- Real-time bids via Socket.IO
- Place bids, watchlist, notifications
- Admin dashboard (admin users)

## Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@bikeauction.com | Admin123! |
| Bidder | bidder@example.com | Bidder123! |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server :5173 |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
