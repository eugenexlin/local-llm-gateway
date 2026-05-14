# Quick Start Guide

This guide provides a fast track to getting the Local LLM Gateway up and running.

## Prerequisites

- Node.js 18+ installed

## Setup & Start (Automated)

### Option 1: Use Root Dev Command (Recommended)

```bash
npm run install:all   # Install dependencies for both backend and frontend
npm run dev:backend   # Start backend (in terminal 1)
npm run dev:frontend  # Start frontend (in terminal 2)
```

This will:
1. Start backend server on http://localhost:3000
2. Start frontend server on http://localhost:5173

### Option 2: Manual Setup

**Step 1: Install Dependencies**

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

**Step 2: Configure Environment Variables**

Copy the example file and edit with your settings:

```bash
cp backend/.env.example backend/.env
```

Backend (`backend/.env`):
```env
PORT=3000
BACKEND_BASE_URL=http://localhost:3000
FRONTEND_BASE_URL=http://localhost:5173
PUBLIC_URL=http://localhost:5173
LLAMA_CPP_URL=http://localhost:8080/v1
DATABASE_PATH=./local_llm_gateway.db
SESSION_SECRET=your-secret-key-here
SESSION_EXPIRY_HOURS=24
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

**Note:** `PUBLIC_URL` is kept as a fallback but is no longer used for OAuth redirects in multi-domain mode. See [Multi-Domain Configuration](#multi-domain-configuration) below.

Frontend (`frontend/.env`):
```env
VITE_DEV_TEST_LOGIN=false
```

## Multi-Domain Configuration

The gateway supports serving the same frontend from multiple domains (e.g., local network IP and Tailscale IP). All API calls use relative URLs, so the browser automatically uses whichever domain it connected to. The backend dynamically detects the requesting domain for CORS and OAuth redirects.

### How URL Detection Works

The backend uses this precedence order to determine the public-facing URL:

1. **`X-Forwarded-Host` / `X-Forwarded-Proto` headers** (highest priority) — set by reverse proxies like nginx. Used for both CORS validation and OAuth redirects when behind a proxy.

2. **`Host` header** — fallback when no proxy headers are present. Used for CORS validation.

3. **Static config fallback** — `FRONTEND_BASE_URL` for OAuth redirects, `PUBLIC_URL` for other fallbacks. Used when no proxy headers are present (dev mode).

### Environment Variables

| Variable | Purpose | Precedence | Default |
|---|---|---|---|
| `FRONTEND_BASE_URL` | Frontend URL for OAuth redirects (dev mode) | Fallback when no `X-Forwarded-Host` | `http://localhost:5173` |
| `BACKEND_BASE_URL` | Backend URL (used by Vite dev proxy) | N/A | `http://localhost:3000` |
| `PUBLIC_URL` | Legacy fallback for OAuth redirects | Lowest | `http://localhost:5173` |
| `ALLOWED_DOMAINS` | Comma-separated whitelist for CORS | Optional | Empty (allow all) |

### Development Mode (No Reverse Proxy)

In dev, the frontend (`localhost:5173`) and backend (`localhost:3000`) run on separate ports. The Vite dev server proxies `/api/`, `/v1/`, and `/auth/` requests to the backend.

- OAuth redirects use `FRONTEND_BASE_URL` (default: `http://localhost:5173`)
- CORS accepts any origin (no `X-Forwarded-Host` header present)
- No `ALLOWED_DOMAINS` needed

```env
# backend/.env
FRONTEND_BASE_URL=http://localhost:5173
BACKEND_BASE_URL=http://localhost:3000
# ALLOWED_DOMAINS not needed for dev
```

### Production Mode (With Nginx Reverse Proxy)

In production, nginx serves the frontend static files and proxies API requests to the backend. Nginx sets `X-Forwarded-Host` and `X-Forwarded-Proto` headers automatically.

- OAuth redirects use the domain from `X-Forwarded-Host` (e.g., `mygateway.ts.net`)
- CORS validates against the `Origin` header, optionally checking `ALLOWED_DOMAINS`
- All domains hitting nginx port 80 work automatically

```env
# backend/.env (docker-compose environment)
FRONTEND_BASE_URL=http://localhost:5173  # Only used as fallback
# ALLOWED_DOMAINS optional - comma-separated list
# ALLOWED_DOMAINS=192.168.1.100:80,mygateway.ts.net:80
```

No `PUBLIC_URL` or `FRONTEND_BASE_URL` changes needed — the gateway auto-detects the requesting domain.

### Optional Domain Whitelist

Set `ALLOWED_DOMAINS` to restrict which domains can make CORS requests. When set, only origins matching the whitelist are accepted.

```env
# backend/.env
ALLOWED_DOMAINS=192.168.1.100:80,mygateway.ts.net:80,localhost:5173
```

Format: comma-separated `host:port` values. Port is optional — if omitted, any port on that host is allowed.

- `ALLOWED_DOMAINS=localhost` → allows `localhost` on any port
- `ALLOWED_DOMAINS=localhost:5173` → allows only `localhost:5173`
- `ALLOWED_DOMAINS=` (empty) → allows all origins (default)

### Docker Deployment

The docker-compose setup works out of the box with multiple domains. Just expose your server on port 80 and access it via any configured hostname/IP:

```bash
# Access via local network
curl http://192.168.1.100/

# Access via Tailscale
curl http://mygateway.ts.net
```

Both work without any configuration changes. Nginx's `server_name _` directive acts as a catch-all, and the backend auto-detects each domain via `X-Forwarded-Host`.

**Step 3: Start Backend Server**

```bash
cd backend
npm run dev
```

**Step 4: Start Frontend (in new terminal)**

```bash
cd frontend
npm run dev
```

## Accessing the Application

- **Frontend**: http://localhost:5173 (development) or http://localhost (Docker)
- **Backend API**: http://localhost:3000

## Development Login

For development testing, set `VITE_DEV_TEST_LOGIN=true` in `frontend/.env`.
This adds a "Test Login" button on the login page that bypasses OAuth.

## Testing API Key Validation

### Create an API Key

1. Login to frontend
2. Go to Dashboard → "Create API Key"
3. Copy the generated key (shown once!)

### Test Proxy Endpoint

```bash
# Using curl
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer lf_YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello"}]
  }'

# Without API key (should fail with 401)
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

## Project Structure

```
local-llm-gateway/
├── backend/                    # Node.js/Express backend (TypeScript)
│   ├── index.ts              # Express app entry point
│   ├── config.ts             # Configuration
│   ├── database.ts           # SQLite with better-sqlite3
│   ├── middleware/
│   │   └── auth.ts           # API key validation
│   ├── routes/               # API routes
│   │   ├── apiKeys.ts        # API key management
│   │   ├── chat.ts           # Chat session routes
│   │   ├── metrics.ts        # Usage metrics and logs
│   │   ├── proxy.ts          # LLM proxy forwarding
│   │   └── serverStats.ts    # Server health stats
│   ├── types/                # TypeScript types
│   └── utils/                # Helper functions
├── frontend/                   # React/Vite frontend (TypeScript + MUI)
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── context/          # Auth and theme context
│   │   ├── pages/            # Dashboard, Login, API Keys, Usage
│   │   ├── theme/            # MUI theme configuration
│   │   ├── types/            # TypeScript types
│   │   └── utils/            # Helper functions
│   ├── vite.config.js
│   └── package.json
├── docker-compose.yml          # Docker deployment
├── package.json                # Root package
└── README.md                   # Project documentation
```

## Features Implemented

### Backend
- ✅ Express.js server with dynamic CORS (auto-detects requesting domain)
- ✅ SQLite database with better-sqlite3
- ✅ API key management (create, list, update, revoke, stats)
- ✅ API key validation middleware (Bearer token)
- ✅ User-specific API keys
- ✅ Usage tracking with token-level metrics
- ✅ Metrics endpoints with user/API key filtering
- ✅ Proxy forwarding to LLM (OpenAI-compatible)
- ✅ Google OAuth authentication with dynamic redirect URLs
- ✅ Server health monitoring
- ✅ Multi-domain support (local network, Tailscale, custom domains)
- ✅ Optional domain whitelist via `ALLOWED_DOMAINS`

### Frontend
- ✅ Google OAuth authentication
- ✅ Test login button for development
- ✅ Polished desktop-style UI with MUI
- ✅ Dashboard with metrics and progressive charts
- ✅ API key management UI
- ✅ Usage logs with filtering and CSV export
- ✅ Insights views (scatter plot, heat map)
- ✅ Dark/light theme support
- ✅ Responsive layout
- ✅ Relative URLs for API calls (works with any domain)
