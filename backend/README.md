# LLM Gateway Backend

Node.js proxy server for local LLM with authentication and usage tracking.

## Setup

```bash
npm install
# Copy .env.example to .env and configure
cp .env.example .env
npm run dev
```

Access API at: http://localhost:3000

## API Endpoints

### Authentication

- `GET /auth/session` - Get current user session
- `POST /auth/logout` - Logout current session
- `POST /auth/test-login` - Development test login (bypasses OAuth)
- `GET /auth/google` - Start Google OAuth flow
- `GET /auth/google/callback` - Google OAuth callback

### Proxy (OpenAI API compatible)

- `POST /v1/chat/completions` - Forward chat completion requests
- `GET /v1/models` - List available models
- Any `/v1/*` path is proxied to the LLM provider (requires API key)

### Metrics & Usage (`/api/metrics/*`)

- `GET /api/metrics/usage` - Get usage logs (paginated)
- `GET /api/metrics/usage/aggregated` - Get aggregated usage by period
- `GET /api/metrics/usage/summary` - Get usage summary statistics
- `GET /api/metrics/trends` - Get usage trends between dates
- `GET /api/metrics/lifetime` - Get lifetime metrics (with optional user/apiKey filters)
- `GET /api/metrics/range` - Get range metrics (requires start/end dates)
- `GET /api/metrics/users` - Get all users
- `GET /api/metrics/users/:userId/api-keys` - Get API keys for a user
- `GET /api/metrics/progressive` - Get progressive chart data
- `GET /api/metrics/timestamps` - Get timestamp template for graphs
- `POST /api/metrics/insights` - Get insights scatter data
- `POST /api/metrics/insights/heatmap` - Get heat map data
- `GET /api/metrics/insights/log/:id` - Get detailed log for a request
- `GET /api/metrics/insights/presets` - Get preset chart configurations
- `GET /api/metrics/cache-summary` - Get cache usage summary

### API Keys (`/api/api-keys/*`)

- `POST /api/api-keys` - Create a new API key
- `GET /api/api-keys` - List current user's API keys
- `PUT /api/api-keys/:id` - Update API key name/description
- `DELETE /api/api-keys/:id` - Revoke or permanently delete an API key
- `GET /api/api-keys/:id/stats` - Get API key usage statistics

### Server Stats (`/api/server-stats/*`)

- `GET /api/server-stats` - Get server health and hardware stats

### Other

- `GET /health` - Health check

## Testing

```bash
# Health check
curl http://localhost:3000/health

# List models (requires API key)
curl http://localhost:3000/v1/models -H "Authorization: Bearer lf_your_key"
```

## Client Integration

### Python (OpenAI SDK)

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3000/v1",
    api_key="lf_your_api_key"
)

response = client.chat.completions.create(
    model="llama3",
    messages=[{"role": "user", "content": "Hello"}]
)
```

### JavaScript

```javascript
const response = await fetch('http://localhost:3000/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer lf_your_api_key'
  },
  body: JSON.stringify({
    model: 'llama3',
    messages: [{ role: 'user', content: 'Hello' }]
  })
});
```

## Project Structure

```
backend/
├── index.ts              # Main application entry point
├── config.ts             # Configuration (reads from .env)
├── database.ts           # SQLite database with better-sqlite3
├── middleware/
│   └── auth.ts           # API key validation middleware
├── routes/
│   ├── apiKeys.ts        # API key CRUD operations
│   ├── chat.ts           # Chat session management
│   ├── metrics.ts        # Usage metrics and analytics
│   ├── proxy.ts          # LLM proxy forwarding
│   └── serverStats.ts    # Server health monitoring
├── types/
│   └── metrics.ts        # Metric type definitions
├── utils/
│   ├── granularity.ts    # Time bucketing utilities
│   ├── hash.ts           # API key hashing
│   ├── passport.ts       # Google OAuth strategy
│   ├── proxy-util.ts     # Proxy request helpers
│   ├── streaming-token-parser.ts  # Token counting from streams
│   └── systemMetrics.ts  # System hardware monitoring
├── tests/                # Jest test suite
├── .env.example          # Environment variable template
├── Dockerfile            # Docker image definition
└── package.json          # Dependencies and scripts
```

## Build & Production

```bash
npm run build    # Compile TypeScript to dist/
npm start        # Run compiled production build
```
