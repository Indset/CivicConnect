# CivicConnect

MERN Stack Public Complaint Tracker

---

## Tech Stack

- **Backend:** Node.js, Express.js, MongoDB (Mongoose), JWT
- **Frontend:** React, Vite
- **Media:** Cloudinary, Multer
- **Infra:** Docker, GitHub Actions, Render

---

## Features

- Cookie-based authentication, profiles, and password reset
- Complaint reporting and tracking with image uploads, mapped locations, and owner-only edits/deletes
- Public complaint feed with filters, pagination, and upvotes
- Admin status transitions with complaint history, in-app notifications, and optional email updates
- Admin analytics for status, category, trend, resolution time, and upvote metrics
- Authenticated AI category suggestions with a keyword-matching fallback
- Awareness tips and community drives with maps, participant limits, and admin content management

---

## Local Development

```bash
# 1. Install root, client, and server dependencies
npm install
npm install --prefix client
npm install --prefix server

# 2. Create and configure local environment files
cp .env.example .env
cp client/.env.example client/.env

# 3. Start the frontend and backend
npm run dev
```

Set `MONGO_URI` and `JWT_SECRET` in the root `.env` before starting the API.
Cloudinary, SMTP, and Anthropic credentials are optional in development.
Without them, uploads and email delivery are unavailable, and AI suggestions
use keyword matching. Configure the relevant services for production.

Or run with Docker (includes local MongoDB):

```bash
docker compose up --build
```

Complaint photos are stored in Cloudinary using the `CLOUDINARY_*` variables below. Maps use OpenStreetMap tiles and Nominatim reverse geocoding; location access requires browser permission (and HTTPS outside localhost), while manual address entry remains available.

---

## Deployment

### Prerequisites

- [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (free tier works)
- [Cloudinary](https://cloudinary.com) account
- [Render](https://render.com) account
- GitHub repository with this code

---

### 1. MongoDB Atlas Setup

1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a database user with read/write access
3. Whitelist `0.0.0.0/0` (or Render's IP range) under **Network Access**
4. Copy the connection string — it looks like:
   ```
   mongodb+srv://<user>:<password>@<cluster>.mongodb.net/civicconnect?retryWrites=true&w=majority
   ```

---

### 2. Render Deployment

#### Option A — Docker (recommended)

1. Push this repo to GitHub
2. In Render → **New Web Service** → connect your repo
3. Set **Root Directory** to `server`
4. Set **Environment** to `Docker`
5. Add all environment variables from `.env.production` in the Render dashboard
6. Copy the **Deploy Hook URL** from Render → Settings → Deploy Hook
7. Add it as `RENDER_DEPLOY_HOOK_URL` in GitHub → Settings → Secrets

#### Option B — Native Node

1. Same as above but set:
   - **Build Command:** `npm ci --omit=dev`
   - **Start Command:** `node src/server.js`

---

### 3. Environment Variables (Production)

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Random string ≥ 64 characters |
| `JWT_EXPIRES_IN` | Token TTL e.g. `1d` |
| `JWT_COOKIE_EXPIRES_DAYS` | Cookie TTL in days |
| `CORS_ORIGINS` | Comma-separated allowed frontend URLs |
| `CLIENT_URL` | Frontend URL |
| `COOKIE_SAME_SITE` | `none` for cross-origin (Render + Vercel) |
| `SMTP_HOST` | SMTP server host |
| `SMTP_PORT` | SMTP port (usually `587`) |
| `SMTP_SECURE` | `true` for port 465, `false` otherwise |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `MAIL_FROM` | Sender name and address |
| `ANTHROPIC_API_KEY` | Optional Anthropic API key for category suggestions |
| `AI_MODEL` | Anthropic model name (defaults to `claude-3-5-haiku-latest`) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `PORT` | `5000` (Render sets this automatically) |
| `NODE_ENV` | `production` |
| `TRUST_PROXY` | `true` on Render |
| `REQUEST_BODY_LIMIT` | Maximum request body size (default `1mb`) |
| `SHUTDOWN_TIMEOUT_MS` | Graceful shutdown timeout (default `10000`) |
| `VITE_API_URL` | Client build-time API base URL, e.g. `https://api.example.com/api/v1` |

`SMTP_PASSWORD` and `EMAIL_FROM` remain supported as backward-compatible SMTP
aliases. The client also accepts the legacy `VITE_API_BASE_URL`; `VITE_API_URL`
takes precedence. `VITE_API_URL` is a frontend build-time setting, not a server
environment variable.

> Never commit `.env` or `.env.production` — they are in `.gitignore`.

---

### 4. CI/CD (GitHub Actions)

The workflow at `.github/workflows/ci-cd.yml`:

- Runs the full test suite on every push and pull request to `main`
- On merge to `main`, triggers a Render deploy via webhook

Required GitHub secret:

| Secret | Value |
|---|---|
| `RENDER_DEPLOY_HOOK_URL` | Deploy hook URL from Render dashboard |

---

### 5. Health Check

```
GET /api/v1/health
```

Returns `200` with uptime, timestamp, and database connection state. Render and Docker both use this endpoint for health monitoring.

---

## API Documentation

Swagger UI is available at `/api/docs` when the server is running.

---

## Awareness content

The Awareness page provides public civic-sense tips and cleanliness-drive listings.
Drive dates and times are stored and displayed as UTC. Signed-in users can join or
leave upcoming drives; administrators can manage tips and drives from the page.
To populate an empty database with sample content, first create an administrator
account, then run this from `server/`:

```bash
npm run seed:awareness
```

The seed command uses the configured `MONGO_URI`, preserves existing records with
the same titles, and requires an active administrator to own the seeded content.

---

## Production Checklist

- [ ] MongoDB Atlas cluster created and connection string copied
- [ ] `JWT_SECRET` is at least 64 random characters
- [ ] `CORS_ORIGINS` set to exact frontend URL (no trailing slash)
- [ ] `COOKIE_SAME_SITE=none` and `TRUST_PROXY=true` set on Render
- [ ] SMTP credentials configured (required in production)
- [ ] Cloudinary credentials configured
- [ ] `RENDER_DEPLOY_HOOK_URL` added to GitHub Secrets
- [ ] `.env.production` is NOT committed to git
