import express, { Application, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import * as crypto from 'crypto';
import 'dotenv/config';

import * as database from './database';
import { validateApiKey } from './middleware/auth';
import apiKeys from './routes/apiKeys';
import metrics from './routes/metrics';
import proxy from './routes/proxy';
import serverStats from './routes/serverStats';
import chat from './routes/chat';
import config from './config';
import './utils/passport';

interface SessionRequest extends Request {
  session: any;
  user?: any;
}

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Trust proxy
app.set('trust proxy', 1);

// Determine if secure cookies should be used
// Checks X-Forwarded-Proto header (set by nginx) or falls back to NODE_ENV
const shouldUseSecureCookies = (req: express.Request): boolean => {
  const forwardedProto = req.headers['x-forwarded-proto'];
  if (forwardedProto) {
    return forwardedProto === 'https';
  }
  return process.env.NODE_ENV === 'production';
};

// Middleware
app.use(cors({
  origin: config.frontendBaseUrl,
  credentials: true
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Session middleware - secure flag is set dynamically per-request below
app.use(session({
  secret: config.secretKey,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: config.sessionExpiryHours * 60 * 60 * 1000,
  },
  proxy: true
}));

// Set secure cookie flag based on X-Forwarded-Proto before response is sent
app.use((req, res, next) => {
  if (req.session && req.session.cookie) {
    req.session.cookie.secure = shouldUseSecureCookies(req);
  }
  next();
});

app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/api-keys', apiKeys);
app.use('/api/metrics', metrics);
app.use('/api/server-stats', serverStats);
app.use('/api/chat', chat);
app.use('/v1', (req, res, next) => {
  if (process.env.SUPPRESS_CONSOLE !== 'true') {
    console.log(`${req.method} ${req.path} | Query: ${JSON.stringify(req.query)}`);
  }
  next();
}, validateApiKey, proxy);

// Session Auth Routes
app.get('/auth/session', (req: SessionRequest, res: Response) => {
  if (req.user) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

app.post('/auth/logout', (req: SessionRequest, res: Response) => {
  req.session.destroy((err: any) => {
    if (err) {
      console.error('Failed to destroy session:', err);
    }
    res.json({ success: true });
  });
});

app.post('/auth/test-login', (req: SessionRequest, res: Response) => {
  const { email, name } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  let user = database.findUserByEmail(email);
  
  if (!user) {
    user = database.createUser({
      id: `user-${crypto.randomUUID()}`,
      email: email.toLowerCase().trim(),
      name: name || email.split('@')[0],
      oauth_id: null,
      oauth_provider: 'test',
    });
  }

  const sessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    oauthProvider: user.oauth_provider || 'test',
  };

  req.login(sessionUser, (err) => {
    if (err) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Login failed' });
    }
    res.json({ user: sessionUser });
  });
});

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
  (req: SessionRequest, res: Response) => {
    const user = req.user as database.User;
    
    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      oauthProvider: user.oauth_provider || 'google',
    };

 req.login(sessionUser, (err: any) => {
      if (err) {
        console.error('OAuth login error:', err);
        return res.redirect(`${config.publicUrl}/login?error=session_error`);
      }
      res.redirect(`${config.publicUrl}/?authenticated=true`);
    });
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
