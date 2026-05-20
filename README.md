# Local LLM Gateway

A proxy server for local LLM requests with authentication, usage metrics, and system monitoring.


> [!WARNING]
> Heavily generated with ai using primarily qwen 2.6 moe 4bit and opencode with limited human review and refactor. Reference at your own risk.


## Features

- OpenAI-compatible proxy for local LLMs
- Google OAuth integration to user identification
- Usage tracking with metrics bound to api keys
- SQLite database for storing requests and usage data
- nginx docker compose setup 

## Project Structure

```
local-llm-gateway/
├── backend/                # Express/TypeScript Proxy Server
│   ├── index.ts            # Main entry point
│   ├── config.ts           # Configuration
│   ├── database.ts         # SQLite database logic
│   ├── middleware/         # Auth middleware
│   ├── routes/             # API route handlers
│   ├── types/              # TypeScript definitions
│   └── utils/              # Helper functions
├── frontend/               # React/Vite Dashboard (MUI)
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── context/        # Auth and theme management
│   │   ├── pages/          # Dashboard, Login, API Keys, Usage pages
│   │   ├── theme/          # MUI theme configuration
│   │   ├── types/          # TypeScript type definitions
│   │   └── utils/          # Helper functions
│   ├── vite.config.js      # Vite configuration
│   └── index.html          # HTML entry point
├── docker-compose.yml      # Docker deployment
├── backend/Dockerfile      # Backend Docker image
├── package.json            # Root orchestration scripts
└── README.md               # Project documentation
```

## Getting Started

For detailed installation, environment configuration, and development instructions, please refer to the [Quick Start Guide](QUICKSTART.md).

## Documentation

- [QUICKSTART.md](QUICKSTART.md) - Quick start guide
- [backend/README.md](backend/README.md) - Backend documentation (including API Endpoints)
- [backend/SCHEMA.md](backend/SCHEMA.md) - Database schema
