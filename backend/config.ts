import 'dotenv/config';

interface Config {
  port: number;
  llamaCppUrl: string;
  databasePath: string;
  secretKey: string;
  jwtExpiryHours: number;
  apiKeyName: string;
}

const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  llamaCppUrl: process.env.LLAMA_CPP_URL || 'http://localhost:8080/v1',
  databasePath: process.env.DATABASE_PATH || './local_llm_gateway.db',
  secretKey: process.env.SECRET_KEY || 'dev-secret-key-change-in-production',
  jwtExpiryHours: parseInt(process.env.JWT_EXPIRY_HOURS || '24', 10),
  apiKeyName: process.env.API_KEY_HEADER || 'x-api-key'
};

export default config;
