# Quick Start Guide

## Prerequisites
- Node.js 18+ installed (already have v24.14.1)

## Setup & Start (Automated)

### Option 1: Use Unified Dev Command (Recommended)
```bash
npm run dev
```

This will:
1. Start backend server on http://localhost:3000
2. Start frontend server on http://localhost:5174
3. Run both with colored, filtered output

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

Backend (`backend/.env`):
```env
PORT=3000
LLM_API_URL=http://localhost:8080/v1
DATABASE_PATH=./llm_firewall.db
JWT_SECRET=your-secret-key-here
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

Frontend (`frontend/.env`):
```env
VITE_API_URL=http://localhost:3000
VITE_DEV_TEST_LOGIN=false
```

**Step 3: Start Backend Server**
```bash
cd backend
node index.js
```

**Step 4: Start Frontend (in new terminal)**
```bash
cd frontend
npm run dev
```

## Accessing the Application

- **Frontend**: http://localhost:5174
- **Backend API**: http://localhost:3000
- **API Docs**: http://localhost:3000/docs (Swagger - if enabled)

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
llm-firewall/
├── backend/                    # Node.js/Express backend
│   ├── index.js              # Express app entry point
│   ├── config.js             # Configuration
│   ├── database.js           # SQLite with sql.js
│   ├── middleware/
│   │   └── auth.js           # API key validation middleware
│   ├── routes/
│   │   ├── apiKeys.js        # API key management
│   │   ├── metrics.js        # Metrics endpoints
│   │   └── proxy.js          # Proxy routes to LLM
│   ├── utils/
│   │   └── hash.js           # Hash functions
│   ├── SCHEMA.md             # Database schema
│   ├── .env                  # Environment variables
│   └── package.json          # Node.js dependencies
├── frontend/                   # React/Vite frontend
│   ├── src/
│   │   ├── App.jsx           # Main app with routing
│   │   ├── App.css           # Desktop-style styling
│   │   ├── context/
│   │   │   └── AuthContext.jsx # Auth state management
│   │   └── pages/
│   │       ├── Login.jsx     # Login page (Google OAuth)
│   │       ├── Dashboard.jsx # Metrics dashboard
│   │       ├── APIKeys.jsx   # API key management
│   │       └── Usage.jsx     # Usage logs view
│   ├── vite.config.js        # Vite configuration
│   └── package.json          # Node dependencies
├── package.json              # Root package with concurrently
├── PROGRESS.md               # Detailed progress log
└── QUICKSTART.md             # This file
```

## Features Implemented

### Backend
- ✅ Express.js server with CORS
- ✅ SQLite database with sql.js (pure JavaScript)
- ✅ API key management (create, list, revoke, stats)
- ✅ API key validation middleware (Bearer token)
- ✅ User-specific API keys
- ✅ Usage tracking with user_id
- ✅ Metrics endpoints with user filtering
- ✅ Proxy forwarding to inner LLM
- ✅ Async database initialization

### Frontend
- ✅ Google OAuth authentication (ready for config)
- ✅ Test login button for development
- ✅ Polished desktop-style UI
- ✅ Dashboard with metrics and charts
- ✅ API key management UI
- ✅ Usage logs with filtering
- ✅ CSV export
- ✅ Responsive layout
- ✅ Auth context with loading states

## Next Steps

See [PROGRESS.md](PROGRESS.md) and [PLAN.md](PLAN.md) for detailed next steps and architecture notes.
