# Ronin Together

Edo-inspired cooperative survival game for 1–4 players.

## Run locally

Use Node 22, then `npm ci`, `npm run dev`.

## Hosting

Deploy as one Render web service with `npm ci --include=dev && npm run build`, start `npm start`, and `NODE_ENV=production`. Use a single instance for shared in-memory rooms.
