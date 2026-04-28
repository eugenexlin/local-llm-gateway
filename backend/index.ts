import express, { Application, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import 'dotenv/config';

import * as database from './database';
import { validateApiKey } from './middleware/auth';
import apiKeys from './routes/apiKeys';
import metrics from './routes/metrics';
import proxy from './routes/proxy';
import serverStats from './routes/serverStats';
import config from './config';
import './utils/passport';

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Trust proxy
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: config.frontendBaseUrl,
  credentials: true
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(session({
  secret: config.secretKey,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000,
  }
}));
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/api-keys', apiKeys);
app.use('/api/metrics', metrics);
app.use('/api/server-stats', serverStats);
app.use('/v1', (req, res, next) => {
  if (process.env.SUPPRESS_CONSOLE !== 'true') {
    const safeHeaders = Object.fromEntries(Object.entries(req.headers).filter(([k]) => !['authorization', 'cookie', 'x-api-key'].includes(k.toLowerCase())));
    console.log(`${req.method} ${req.path} | Query: ${JSON.stringify(req.query)} | Headers: ${JSON.stringify(safeHeaders)}`);
  }
  next();
}, validateApiKey, proxy);

// OAuth Routes
app.get('/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false
}));

app.get('/auth/google/callback', 
  passport.authenticate('google', {
    failureRedirect: `${config.publicUrl}/login?error=authentication_failed`,
    session: false
  }),
  (req: Request, res: Response) => {
    const user = req.user as database.User;
    res.redirect(`${config.publicUrl}/authcallback?provider=google&email=${encodeURIComponent(user.email)}&name=${encodeURIComponent(user.name || '')}&oauthId=${user.oauth_id || ''}&userId=${user.id}`);
  }
);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Error handling
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize database and start server
try {
  database.init();
  app.listen(PORT, () => {
    console.log(`LLM Gateway Proxy running on port ${PORT} | Llama CPP: ${config.llamaCppUrl}`);
  });
} catch (err) {
  console.error('Failed to initialize database:', err);
  process.exit(1);
}
