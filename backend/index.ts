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
import config from './config';
import './utils/passport';

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
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
app.use('/v1', (req, res, next) => {
  console.log('\n=== INCOMING REQUEST ===');
  console.log('Method:', req.method);
  console.log('Path:', req.path);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Query:', req.query);
  next();
}, validateApiKey, proxy);

// OAuth Routes
app.get('/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false
}));

app.get('/auth/google/callback', 
  passport.authenticate('google', {
    failureRedirect: 'http://localhost:5173/login?error=authentication_failed',
    session: false
  }),
  (req: Request, res: Response) => {
    const user = req.user as database.User;
    const frontendUrl = 'http://localhost:5173';
    res.redirect(`${frontendUrl}/auth/callback?provider=google&email=${encodeURIComponent(user.email)}&name=${encodeURIComponent(user.name || '')}&oauthId=${user.oauth_id || ''}&userId=${user.id}`);
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
database.init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`LLM Firewall Proxy running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
