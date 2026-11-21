# URL Shortener

A URL shortener with a static frontend, Cloudflare Pages Functions API, and PostgreSQL storage. The browser keeps the IDs of links it created in `localStorage`; PostgreSQL remains the source of truth for redirects, click counts, and analytics. URL Shortener turns long URLs into short, shareable links. It redirects visitors to the original page and tracks link clicks.

## Stack

- Cloudflare Pages and Pages Functions
- PostgreSQL on Neon
- Cloudflare Hyperdrive
- Node.js, Express.js, HTML, CSS, and JavaScript

## Live Demo

[View the project](https://urlshortner-4ht.pages.dev)

