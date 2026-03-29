# Local LLM Gateway

A proxy server for local LLM requests with authentication, rate limiting, and usage tracking.

## Features

- API authentication and authorization
- Rate limiting and usage tracking
- SQLite database for storing requests and usage data
- Real-time usage monitoring
- React-based dashboard for metrics visualization

## Project Structure

```
local-llm-gateway/
├── backend/
│   ├── index.js           # Express server entry point
│   ├── config.js          # Configuration settings
│   ├── database.js        # SQLite database operations
│   ├── routes/            # API routes
│   │   ├── auth.js        # Authentication routes
│   │   ├── proxy.js       # Proxy routes (OpenAI API compatible)
│   │   ├── apiKeys.js     # API key management
│   │   └── metrics.js     # Metrics and stats routes
│   ├── middleware/        # Express middleware
│   └── utils/             # Utility functions
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   └── App.jsx        # Main app component
│   ├── vite.config.js     # Vite configuration
│   └── index.html         # HTML entry point
├── package.json           # Root package.json
└── bun.lock               # Bun lockfile
```

## Setup

### Prerequisites

- Node.js or Bun
- SQLite (included with sql.js)

### Installation

```bash
# Install dependencies for both backend and frontend
npm run install:all

# Or manually
cd backend && bun install
cd ../frontend && bun install
```

### Environment Configuration

```bash
# Backend (.env)
API_KEY=your-api-key
PORT=3000

# Frontend (.env)
VITE_API_URL=http://localhost:3000
```

## Development

```bash
# Start both backend and frontend
npm run dev

# Start only backend
npm run dev:backend

# Start only frontend
npm run dev:frontend
```

Backend runs on: http://localhost:3000
Frontend runs on: http://localhost:5173

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new API key
- `POST /api/auth/login` - Login and get token

### Proxy (OpenAI API compatible)
- `POST /v1/chat/completions` - Forward chat completion requests
- `GET /v1/models` - List available models
- Any `/v1/*` path is proxied to the LLM provider

### Usage
- `GET /api/usage/requests` - Get request history
- `GET /api/usage/metrics` - Get usage metrics
- `GET /api/usage/stats` - Get usage statistics

## Documentation

- [PLAN.md](PLAN.md) - Project plan and architecture
- [QUICKSTART.md](QUICKSTART.md) - Quick start guide
- [PROGRESS.md](PROGRESS.md) - Development progress
- [backend/README.md](backend/README.md) - Backend documentation
- [backend/SCHEMA.md](backend/SCHEMA.md) - Database schema
