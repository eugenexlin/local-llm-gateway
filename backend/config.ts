import 'dotenv/config';

interface Config {
  port: number;
  backendBaseUrl: string;
  frontendBaseUrl: string;
  llamaCppUrl: string;
  databasePath: string;
  secretKey: string;
  sessionExpiryHours: number;
  googleClientId: string;
  googleClientSecret: string;
  googleCallbackUrl: string;
}


const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  backendBaseUrl: process.env.BACKEND_BASE_URL || 'http://localhost:3000',
  frontendBaseUrl: process.env.FRONTEND_BASE_URL || 'http://localhost:5173',
  llamaCppUrl: process.env.LLAMA_CPP_URL || 'http://localhost:8080/v1',
  databasePath: process.env.DATABASE_PATH || './local_llm_gateway.db',
  secretKey: process.env.SESSION_SECRET || 'dev-secret-key-change-in-production',
  sessionExpiryHours: parseInt(process.env.SESSION_EXPIRY_HOURS || '24', 10),
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL || `${process.env.BACKEND_BASE_URL || 'http://localhost:3000'}/auth/google/callback`,
};

export default config;
