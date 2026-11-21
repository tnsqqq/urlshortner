# URL Shortener

URL Shortener turns long URLs into short, shareable links. It redirects visitors to the original page and tracks link clicks.

## Live Demo

[View the project](https://urlshortner-4ht.pages.dev)

## Tech Stack

- Cloudflare Pages and Pages Functions
- PostgreSQL on Neon
- Cloudflare Hyperdrive
- Node.js, Express, HTML, CSS, and JavaScript

## Database connection and keep-alive

Set `DATABASE_URL` to Neon’s pooled connection string (the hostname contains
`-pooler`) with `sslmode=require`. Cloudflare Pages uses its Hyperdrive binding.
Both runtimes reuse a small `pg.Pool`.

The standalone Express server warms the database at startup and sends a
`SELECT 1` every four minutes. Pages Functions do not run as a persistent
process, so the scheduled keep-alive uses a separate Cloudflare Worker:

```powershell
npm run deploy:keepalive
```

Deploying this Worker requires the existing Hyperdrive binding in
`wrangler.keepalive.toml`. A four-minute ping keeps Neon compute active instead
of allowing it to scale to zero. This means roughly 720 active hours in a
30-day month (about 180 CU-hours at a 0.25 CU compute). Review your Neon plan
and usage before enabling it. Neon Free includes 100 CU-hours per project, so
this keep-alive would exceed that allowance at 0.25 CU.
