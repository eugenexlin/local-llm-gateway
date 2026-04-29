import 'dotenv/config';
import * as crypto from 'crypto';

interface Config {
  port: number;
  backendBaseUrl: string;
  frontendBaseUrl: string;
  publicUrl: string;
  llamaCppUrl: string;
  databasePath: string;
  secretKey: string;
  sessionExpiryHours: number;
  googleClientId: string;
  googleClientSecret: string;
}

const generateSecureSecret = (): string => {
  return crypto.randomBytes(64).toString('hex');
};

const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  backendBaseUrl: process.env.BACKEND_BASE_URL || 'http://localhost:3000',
  frontendBaseUrl: process.env.FRONTEND_BASE_URL || 'http://localhost:5173',
  publicUrl: process.env.PUBLIC_URL || process.env.FRONTEND_BASE_URL || 'http://localhost:5173',
  llamaCppUrl: process.env.LLAMA_CPP_URL || 'http://localhost:8080/v1',
  databasePath: process.env.DATABASE_PATH || './local_llm_gateway.db',
  secretKey: process.env.SESSION_SECRET || generateSecureSecret(),
  sessionExpiryHours: parseInt(process.env.SESSION_EXPIRY_HOURS || '24', 10),
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
};

export default config;
