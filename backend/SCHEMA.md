# Database Schema

This document describes the database schema for the LLM Firewall. The database is stored in `backend/local_llm_gateway.db` using SQLite.

**Note:** If you need to reset the database, simply delete the `.db` file and restart the server. All tables will be recreated automatically.

## Tables

### users

Stores user account information.

```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active INTEGER DEFAULT 1
);
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique user identifier (UUID) |
| email | TEXT | UNIQUE, NOT NULL | User email address |
| name | TEXT | - | User's display name |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Account creation timestamp |
| is_active | INTEGER | DEFAULT 1 | Active status (1 = active, 0 = inactive) |

### sessions

Stores user session information for authentication.

```sql
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique session identifier (UUID) |
| user_id | TEXT | NOT NULL, FOREIGN KEY | Associated user ID |
| token_hash | TEXT | NOT NULL | Hashed session token |
| expires_at | DATETIME | NOT NULL | Session expiration timestamp |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Session creation timestamp |

### api_keys

Stores API keys for programmatic access to the firewall.

```sql
CREATE TABLE api_keys (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    key_hash TEXT UNIQUE NOT NULL,
    user_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    is_active INTEGER DEFAULT 1,
    last_used_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique API key identifier (UUID) |
| name | TEXT | NOT NULL | User-provided name for the key |
| key_hash | TEXT | UNIQUE, NOT NULL | SHA-256 hash of the API key (never stored plain text) |
| user_id | TEXT | FOREIGN KEY | Associated user ID (can be null for system keys) |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Key creation timestamp |
| expires_at | DATETIME | - | Optional expiration date |
| is_active | INTEGER | DEFAULT 1 | Active status (1 = active, 0 = revoked) |
| last_used_at | DATETIME | - | Timestamp of last usage |

**API Key Format:**
- Generated format: `lf_{random_base64_string}`
- Example: `lf_kJ8sL9mN3pQ2rT5vW7xY0zA1bC4dE6fG8hI9jK0lM2n`
- Full key is only returned once when created
- Only the hash is stored in the database

### usage_logs

Stores detailed usage metrics for all API requests.

```sql
CREATE TABLE usage_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    api_key TEXT,
    model TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    request_size INTEGER DEFAULT 0,
    response_size INTEGER DEFAULT 0,
    status_code INTEGER,
    latency_ms INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique log entry ID |
| user_id | TEXT | FOREIGN KEY | Associated user ID |
| api_key | TEXT | FOREIGN KEY | API key hash that made the request |
| model | TEXT | NOT NULL | LLM model used (e.g., "gpt-3.5-turbo") |
| endpoint | TEXT | NOT NULL | API endpoint accessed |
| method | TEXT | NOT NULL | HTTP method (GET, POST, etc.) |
| input_tokens | INTEGER | DEFAULT 0 | Tokens sent to the model |
| output_tokens | INTEGER | DEFAULT 0 | Tokens received from the model |
| total_tokens | INTEGER | DEFAULT 0 | Total tokens (input + output) |
| request_size | INTEGER | DEFAULT 0 | Size of request in bytes |
| response_size | INTEGER | DEFAULT 0 | Size of response in bytes |
| status_code | INTEGER | - | HTTP response status code |
| latency_ms | INTEGER | - | Request latency in milliseconds |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Log creation timestamp |

**Token Estimation:**
- Input tokens are estimated from the request body (1 token ≈ 4 characters)
- Output tokens are taken from the LLM provider's response usage field when available

### rate_limits

Stores rate limiting data per user (not currently implemented).

```sql
CREATE TABLE rate_limits (
    user_id TEXT PRIMARY KEY,
    requests_count INTEGER DEFAULT 0,
    window_start DATETIME,
    requests_per_minute INTEGER DEFAULT 60,
    requests_per_hour INTEGER DEFAULT 1000,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| user_id | TEXT | PRIMARY KEY, FOREIGN KEY | User identifier |
| requests_count | INTEGER | DEFAULT 0 | Number of requests in current window |
| window_start | DATETIME | - | Start time of the rate limit window |
| requests_per_minute | INTEGER | DEFAULT 60 | Rate limit configuration |
| requests_per_hour | INTEGER | DEFAULT 1000 | Rate limit configuration |

## Indexes

Recommended indexes for query performance:

```sql
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX idx_usage_logs_api_key ON usage_logs(api_key);
CREATE INDEX idx_usage_logs_created_at ON usage_logs(created_at);
CREATE INDEX idx_usage_logs_model ON usage_logs(model);
```

## Sample Data

### Creating a test user
```javascript
const userId = crypto.randomUUID();
db.prepare(`
    INSERT INTO users (id, email, name) 
    VALUES (?, ?, ?)
`).run(userId, 'test@example.com', 'Test User');
```

### Creating an API key
```javascript
const keyId = crypto.randomUUID();
const key = `lf_${crypto.randomBytes(32).toString('base64')}`;
const keyHash = crypto.createHash('sha256').update(key).digest('hex');

db.prepare(`
    INSERT INTO api_keys (id, name, key_hash, user_id, expires_at)
    VALUES (?, ?, ?, ?, datetime('now', '+365 days'))
`).run(keyId, 'My API Key', keyHash, userId);
```

## API Response Formats

### Usage Log Entry
```json
{
  "id": 1,
  "user_id": "uuid-here",
  "api_key": "sha256-hash-here",
  "model": "gpt-3.5-turbo",
  "endpoint": "/v1/chat/completions",
  "method": "POST",
  "input_tokens": 100,
  "output_tokens": 50,
  "total_tokens": 150,
  "request_size": 512,
  "response_size": 256,
  "status_code": 200,
  "latency_ms": 1500,
  "created_at": "2026-03-28T10:30:00.000Z"
}
```

### API Key Stats
```json
{
  "key_id": "uuid-here",
  "name": "My API Key",
  "total_requests": 1000,
  "total_input_tokens": 50000,
  "total_output_tokens": 25000,
  "total_tokens": 75000,
  "average_latency_ms": 1234.56
}
```
