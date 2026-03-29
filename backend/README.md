# LLM Firewall Backend

Node.js proxy server for local LLM with authentication and usage tracking.

## Setup

```bash
npm install
cp .env.example .env
# Edit .env with your settings
npm run dev
```

Access API at: http://localhost:3000

## Testing

```bash
curl http://localhost:3000/health

curl http://localhost:3000/v1/models
```

## Client Integration

### Python (OpenAI SDK)
```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3000/v1",
    api_key="any-token"
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
    'Authorization': 'Bearer any-token'
  },
  body: JSON.stringify({
    model: 'llama3',
    messages: [{ role: 'user', content: 'Hello' }]
  })
});
```

## Project Structure

```
src/
├── index.ts              # Main application
├── config.ts             # Configuration
├── database/
│   └── database.ts       # SQLite database
└── proxy/
    ├── forwarding.ts     # Request forwarding
    └── routes.ts         # Proxy routes
```

## Build & Production

```bash
npm run build
npm start
```
