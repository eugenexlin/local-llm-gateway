# Local LLM Gateway

A proxy server for local LLM requests with authentication, rate limiting, and usage tracking.

## Features

- OpenAI-compatible proxy for local LLMs
- API key management and authentication
- Google OAuth integration for dashboard access
- Usage tracking
- SQLite database for storing requests and usage data

## Project Structure

```
local-llm-gateway/
├── backend/                # Express/TypeScript Proxy Server
│   ├── index.ts            # Main entry point for the backend
│   ├── database.ts         # SQLite database logic
│   ├── routes/             # API Route handlers
│   ├── types/              # TypeScript definitions
│   └── utils/              # Helper functions
├── frontend/               # React/Vite Dashboard
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Dashboard and Auth pages
│   │   └── App.tsx         # Main React entry point
│   ├── vite.config.js      # Vite configuration
│   └── index.html          # HTML entry point
├── package.json            # Root orchestration scripts
└── README.md               # Project documentation
```

## Getting Started

For detailed installation, environment configuration, and development instructions, please refer to the [Quick Start Guide](QUICKSTART.md).

## Documentation

- [PLAN.md](PLAN.md) - Project plan and architecture
- [QUICKSTART.md](QUICKSTART.md) - Quick start guide
- [PROGRESS.md](PROGRESS.md) - Development progress
- [backend/README.md](backend/README.md) - Backend documentation (including API Endpoints)
- [backend/SCHEMA.md](backend/SCHEMA.md) - Database schema
