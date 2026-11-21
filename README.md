# URL Shortener

A URL shortener with a static frontend, Cloudflare Pages Functions API, and PostgreSQL storage. The browser keeps the IDs of links it created in `localStorage`; PostgreSQL remains the source of truth for redirects, click counts, and analytics.

## Stack

- Cloudflare Pages and Pages Functions
- PostgreSQL, connected in production through Cloudflare Hyperdrive
- Node.js and Express for local server development
- HTML, CSS, and JavaScript

## Run locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a PostgreSQL database and apply [`schema.sql`](./schema.sql). For Neon, use `DATABASE_URL_UNPOOLED` for schema setup.
3. Set `DATABASE_URL` in `.env.local` (or `.env`) to your PostgreSQL connection string. Neon setup writes these variables with:
   ```bash
   neon env pull --service postgres --file .env.local
   ```
   The local Express server loads `.env.local` before `.env`.
4. Start the local Express server:
   ```bash
   npm start
   ```
   Open `http://localhost:8001`.

To run the Pages Functions locally, configure a Hyperdrive binding in `wrangler.toml`, then set the local Hyperdrive connection string and start the preview:

```bash
CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE=YOUR_POSTGRES_CONNECTION_STRING npm run pages:dev
```

In PowerShell, set the variable with `$env:CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE = "YOUR_POSTGRES_CONNECTION_STRING"` before running `npm run pages:dev`.

## Deploy to Cloudflare Pages

1. Create a PostgreSQL database with your preferred PostgreSQL provider and apply [`schema.sql`](./schema.sql). For Neon, use the direct/unpooled connection string when creating Hyperdrive.
2. Create a Cloudflare Hyperdrive configuration pointing to that database:
   ```bash
   npx wrangler hyperdrive create urlshortner-db --connection-string="YOUR_POSTGRES_CONNECTION_STRING"
   ```
3. Replace `REPLACE_WITH_HYPERDRIVE_CONFIG_ID` in `wrangler.toml` with the ID returned by that command. Keep database credentials out of source control.
4. Deploy the site:
   ```bash
   npm run deploy -- --project-name urlshortner
   ```
   Or connect the repository to Cloudflare Pages and use `public` as the build output directory. Ensure the Pages project uses the compatibility settings in `wrangler.toml` and the `HYPERDRIVE` binding.

The Pages Functions use Hyperdrive to reach PostgreSQL. Do not expose the database connection string to browser code.

## API

- `POST /url` with `{"url":"https://example.com"}` creates a short link.
- `GET /url?ids=id1,id2` lists only the IDs saved by the current browser. `GET /url` without `ids` lists all links.
- `GET /url/analytics/:shortId` returns click analytics.
- `GET /:shortId` records a visit and redirects to the original URL.
- `GET /health` checks the PostgreSQL connection.

`localStorage` is only a convenience for showing links created in the current browser. The short links and click analytics are stored in PostgreSQL and continue to work when shared across devices.

## Tests

```bash
npm test
```
