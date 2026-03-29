# LLM Firewall Proxy

Backend server for proxying requests to local LLM with authentication and usage tracking.

## Quick Start

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

Access API docs at: http://localhost:3000/docs

## Project Structure

```
backend/
├── main.py              # FastAPI application
├── config.py            # Configuration settings
├── database/
│   ├── models.py        # Database models
│   └── database.py      # DB connection
├── proxy/
│   ├── forwarding.py    # Request forwarding logic
│   └── routes.py        # Proxy routes
└── requirements.txt
```

## Full Documentation

See [PLAN.md](../PLAN.md) for complete project plan.
