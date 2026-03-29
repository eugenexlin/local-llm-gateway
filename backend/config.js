require('dotenv').config();

module.exports = {
    port: process.env.PORT || 3000,
    llamaCppUrl: process.env.LLAMA_CPP_URL || 'http://localhost:8080/v1',
    databasePath: process.env.DATABASE_PATH || './llm_firewall.db',
    secretKey: process.env.SECRET_KEY || 'dev-secret-key-change-in-production',
    jwtExpiryHours: parseInt(process.env.JWT_EXPIRY_HOURS) || 24,
    apiKeyName: process.env.API_KEY_HEADER || 'x-api-key'
};
