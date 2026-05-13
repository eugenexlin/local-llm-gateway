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

**Note:** `PUBLIC_URL` is used for OAuth redirects. In production, set this to your public domain (e.g., `https://yourdomain.com`).

Frontend (`frontend/.env`):
```env
VITE_DEV_TEST_LOGIN=false
```

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

## Docker Deployment

```bash
docker-compose up --build
```

This starts:
- Backend service on port 3000 (internal)
- Frontend proxy (nginx) on port 80

Set environment variables via `.env` file or shell before running.

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
- ✅ Express.js server with CORS and session auth
- ✅ SQLite database with better-sqlite3
- ✅ API key management (create, list, update, revoke, stats)
- ✅ API key validation middleware (Bearer token)
- ✅ User-specific API keys
- ✅ Usage tracking with token-level metrics
- ✅ Metrics endpoints with user/API key filtering
- ✅ Proxy forwarding to LLM (OpenAI-compatible)
- ✅ Google OAuth authentication
- ✅ Server health monitoring

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
