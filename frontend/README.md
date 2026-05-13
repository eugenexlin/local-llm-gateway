# Frontend Dashboard

A React + Vite dashboard for managing API keys and monitoring LLM usage.

## Tech Stack

- **Framework**: React 19
- **Build Tool**: Vite
- **Language**: TypeScript
- **UI Library**: Material-UI (MUI) v7
- **Routing**: React Router v7
- **Charts**: Recharts
- **Icons**: Lucide React + MUI Icons
- **Date Handling**: date-fns

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
- **Test Login**: Development-only login button (set `VITE_DEV_TEST_LOGIN=true`).
- **Dashboard**: Real-time metrics, progressive charts, and insights views.
- **API Key Management**: Create, list, update, and revoke API keys.
- **Usage Logs**: Detailed history of all requests with filtering and CSV export.
- **Insights**: Scatter plots and heat maps for performance analysis.
- **Dark/Light Theme**: Full theme support with persistence.
- **Server Stats**: Hardware monitoring (GPU, CPU, memory).

## Project Structure

```
frontend/
├── src/
│   ├── components/     # Reusable UI components
│   ├── context/        # Auth and theme management
│   ├── pages/          # Dashboard, Login, API Keys, Usage, ServerStats
│   ├── theme/          # MUI theme configuration
│   ├── models/         # Data models
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Helper functions
│   ├── App.tsx         # Main application component
│   ├── App.css         # Global styles
│   ├── main.tsx        # Entry point
│   └── index.css       # Base styles
├── vite.config.js      # Vite configuration
└── package.json        # Dependencies and scripts
