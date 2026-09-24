# URL Shortener

A simple full-stack URL shortener built with Node.js, Express, and MongoDB. It takes a long URL, generates a short ID, redirects users to the original link, and tracks click analytics.

## Tech Stack
- Node.js
- Express.js
- MongoDB + Mongoose
- HTML, CSS, JavaScript
- shortid
- dotenv

## Features
- Generate short links from long URLs
- Redirect short URLs to the original destination
- Track total clicks and visit history
- View recent links in a simple frontend
- Use MongoDB when available, or fall back to memory mode locally

## Project Structure
- `index.js` - entry point and server setup
- `connect.js` - MongoDB connection
- `models/url.js` - schema and storage logic
- `controllers/url.js` - short URL generation and analytics logic
- `routes/url.js` - routes
- `public/` - frontend files

## Run Locally

1. Install dependencies:
```bash
npm install
```

2. Start the app:
```bash
npm start
```

3. Open the browser:
```text
http://localhost:8001/
```

## MongoDB Setup
The app uses:
```env
MONGODB_URI=mongodb://localhost:27017/short-url
```

Make sure MongoDB is running locally and that a database named `short-url` exists in MongoDB Compass.

If MongoDB is not running, the app automatically falls back to in-memory mode.

## API Endpoints

### Create short URL
```bash
curl -X POST http://localhost:8001/url \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```

### List URLs
```bash
curl http://localhost:8001/url
```

### Get analytics
```bash
curl http://localhost:8001/url/analytics/<shortId>
```

## How It Works
- The frontend sends the long URL to the backend.
- The backend validates it and creates a short ID.
- The short ID is stored with the original URL and a click counter.
- When the short URL is opened, the app increments the counter and redirects to the original destination.

## Notes
This project is ideal for learning:
- Express route handling
- MongoDB integration
- full-stack CRUD flow
- redirect logic and analytics tracking
