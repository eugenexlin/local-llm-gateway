# LLM Firewall Proxy Server

## Overview

A proxy server that sits between authenticated users and a local LLM (llama.cpp), providing:
- Google OAuth authentication
- Usage tracking and statistics
- Request filtering and rate limiting
- OpenAI-compatible API interface

## Architecture

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────┐
│   Clients   │────▶│  Proxy Server   │────▶│  llama.cpp   │
│  (ai-sdk)   │     │  :3000/v1       │     │  :8080/v1    │
└─────────────┘     └─────────────────┘     └──────────────┘
                        │        │
                        ▼        ▼
                   ┌─────────┐  ┌────────────┐
                   │ Google  │  │  SQLite    │
                   │ OAuth   │  │  Database  │
                   └─────────┘  └────────────┘
```

## Tech Stack

- **Backend**: Node.js/Express
- **Frontend**: React with Vite
- **Database**: SQLite (sql.js - pure JavaScript)
- **Auth**: Google OAuth2 (stub for development)
- **LLM**: llama.cpp at `http://localhost:8080/v1`
- **Clients**: OpenAI SDK (ai-sdk compatible)

## Project Structure

```
llm-firewall/
├── backend/
│   ├── index.js           # Express application entry
│   ├── config.js          # Configuration
│   ├── database.js        # SQLite with sql.js
│   ├── middleware/
│   │   └── auth.js        # Auth validation middleware
│   ├── routes/
│   │   ├── apiKeys.js     # API key management
│   │   ├── metrics.js     # Metrics endpoints
│   │   └── proxy.js       # Proxy routes to LLM
│   ├── utils/
│   │   └── hash.js        # Hash functions
│   ├── SCHEMA.md          # Database schema
│   ├── .env               # Environment variables
│   └── package.json       # Node dependencies
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Main app with routing
│   │   ├── App.css        # Desktop-style styling
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   └── pages/
│   │       ├── Login.jsx
│   │       ├── Dashboard.jsx
│   │       ├── APIKeys.jsx
│   │       └── Usage.jsx
│   ├── vite.config.js
│   └── package.json
├── package.json           # Root with concurrently
└── README.md
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,           -- Google user ID
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1
);
```

### API Keys Table
```sql
CREATE TABLE api_keys (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Usage Logs Table
```sql
CREATE TABLE usage_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    api_key_id TEXT,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    model TEXT,
    tokens_used INTEGER DEFAULT 0,
    response_size INTEGER DEFAULT 0,
    status_code INTEGER,
    latency_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (api_key_id) REFERENCES api_keys(id)
);
```

## API Endpoints

### Proxy Endpoints (Forwarded to LLM)
- `POST /v1/chat/completions` - Chat completion
- `POST /v1/completions` - Text completion
- `GET /v1/models` - List available models
- `POST /v1/embeddings` - Embeddings

**Authentication**: Bearer token in Authorization header
```
Authorization: Bearer lf_api_key_here
```

### API Key Management Endpoints
- `POST /api/api-keys` - Create new API key
- `GET /api/api-keys` - List all API keys for user
- `DELETE /api/api-keys/:id` - Revoke API key
- `GET /api/api-keys/:id/stats` - Get API key usage stats

### Metrics Endpoints
- `GET /api/metrics/overview` - Dashboard overview
- `GET /api/metrics/usage` - Detailed usage logs
- `GET /api/metrics/summary` - Aggregated usage summary

### Auth Endpoints
- `GET /auth/google` - Initiate Google OAuth
- `GET /auth/google/callback` - OAuth callback
- `POST /auth/logout` - End session

## Implementation Phases

### Phase 1: Backend Conversion to Node.js (COMPLETED)
- [x] Set up Node.js/Express project structure
- [x] Configure sql.js for SQLite database
- [x] Convert database schema and initialization
- [x] Create async database initialization
- [x] Set up environment configuration
- [x] Create API key management routes
- [x] Create metrics routes
- [x] Create proxy forwarding routes
- [x] Implement API key validation middleware
- [x] Set up authentication middleware
- [x] Configure CORS and error handling

### Phase 2: Frontend Updates (COMPLETED)
- [x] Update API endpoint URLs (port 8000 → 3000)
- [x] Remove username/password authentication
- [x] Add Google OAuth login flow
- [x] Add test login button for development
- [x] Fix AuthContext loading state bug
- [x] Update package.json and dependencies
- [x] Configure Vite environment variables

### Phase 3: Development Environment (COMPLETED)
- [x] Configure concurrently for unified startup
- [x] Set up colored output for both services
- [x] Remove Python startup scripts
- [x] Update documentation (QUICKSTART.md, PLAN.md)

### Phase 4: Authentication (IN PROGRESS)
- [x] Add Google OAuth button UI
- [ ] Set up Google Cloud Console credentials
- [ ] Implement OAuth2 flow callback handling
- [ ] Create user session management
- [ ] Add auth middleware for protected routes
- [ ] Test OAuth flow end-to-end

### Phase 5: Proxy Functionality (READY FOR TESTING)
- [x] Create proxy forwarding logic
- [x] Add API key validation to proxy
- [ ] Configure LLM_API_URL in backend/.env
- [ ] Test proxy forwarding to llama.cpp
- [ ] Add request/response logging
- [ ] Add error handling for LLM failures

### Phase 6: Usage Tracking (COMPLETED)
- [x] Database schema with UsageLog model
- [x] Usage logging in proxy routes
- [x] Token counting (input/output tokens)
- [x] Statistics endpoints
- [x] Usage logs UI with filtering

### Phase 7: API Key Management (COMPLETED)
- [x] ApiKey database model
- [x] CRUD endpoints (create, list, revoke, stats)
- [x] API key validation in proxy middleware
- [x] Per-key usage tracking
- [ ] Add per-key rate limiting (future)
- [ ] Add request queuing for overload (future)

### Phase 8: Dashboard & Frontend (COMPLETED)
- [x] React/Vite frontend set up
- [x] Login page with OAuth
- [x] Dashboard with metrics charts
- [x] API Keys management page
- [x] Usage logs page with filtering
- [x] Connected frontend to backend APIs
- [x] Add proper error handling and loading states
- [ ] Security hardening

### Phase 9: Production Ready (Future)
- [ ] Full OAuth2 integration
- [ ] Rate limiting per user/key
- [ ] Request queuing for overload
- [ ] Comprehensive logging
- [ ] Security hardening
- [ ] Deployment configuration

## Configuration

### Environment Variables

**Backend (`backend/.env`)**:
```env
# Server
PORT=3000
LLM_API_URL=http://localhost:8080/v1

# Database
DATABASE_PATH=./local_llm_gateway.db

# Security
JWT_SECRET=your-secret-key-here
JWT_EXPIRY_HOURS=24

# Google OAuth (production)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

**Frontend (`frontend/.env`)**:
```env
# API Backend URL
VITE_API_URL=http://localhost:3000

# Development Test Login (bypasses OAuth)
VITE_DEV_TEST_LOGIN=false
```

## Client Integration

### Python (OpenAI SDK)
```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3000/v1",
    api_key="lf_YOUR_API_KEY_HERE"
)

response = client.chat.completions.create(
    model="llama3",
    messages=[{"role": "user", "content": "Hello"}]
)
```

### JavaScript (ai-sdk)
```javascript
import { createOpenAI } from '@ai-sdk/openai';

const llm = createOpenAI({
  baseURL: 'http://localhost:3000/v1',
  apiKey: 'lf_YOUR_API_KEY_HERE'
});
```

### JavaScript (fetch)
```javascript
const response = await fetch('http://localhost:3000/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer lf_YOUR_API_KEY_HERE'
  },
  body: JSON.stringify({
    model: 'llama3',
    messages: [{ role: 'user', content: 'Hello' }]
  })
});
```

## Development Commands

### Unified Start (Recommended)
```bash
npm run dev
```
Starts both backend (port 3000) and frontend (port 5174) with colored output.

### Backend Only
```bash
cd backend
node index.js
```

### Frontend Only
```bash
cd frontend
npm run dev
```

### Build for Production
```bash
# Frontend
cd frontend
npm run build

# Backend (no build step needed for Node.js)
```

## Next Steps

### Immediate
1. [ ] Configure `LLM_API_URL` in `backend/.env`
2. [ ] Test API key creation and proxy functionality
3. [ ] Set up Google Cloud Console credentials for OAuth

### Short-term
1. [ ] Complete OAuth2 flow implementation
2. [ ] Test with OpenAI SDK client
3. [ ] Add comprehensive logging
4. [ ] Security hardening
5. [ ] Rate limiting per user/key

### Long-term
1. [ ] Request queuing for overload
2. [ ] Production database migration (if needed)
3. [ ] Deployment configuration
4. [ ] Monitoring and alerting
