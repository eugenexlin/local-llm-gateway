# Frontend Dashboard

A React + Vite dashboard for managing API keys and monitoring LLM usage.

## Tech Stack

- **Framework**: React
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS (if applicable, I'll double check)

## Setup & Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at http://localhost:5173 by default.

## Features

- **Google OAuth Authentication**: Secure access via Google.
- **Dashboard**: Real-time metrics and usage charts.
- **API Key Management**: Create, list, and revoke API keys.
- **Usage Logs**: Detailed history of all requests with filtering.
- **Data Export**: Export usage logs as CSV.

## Project Structure

```
frontend/
├── src/
│   ├── components/     # Reusable UI components
│   ├── context/        # Auth and state management
│   ├── pages/          # Dashboard, Login, API Keys, and Usage pages
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Helper functions
│   ├── App.tsx         # Main application component
│   └── main.tsx        # Entry point
├── vite.config.js      # Vite configuration
└── package.json        # Dependencies and scripts
```
