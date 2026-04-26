const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'local_llm_gateway.db');

try {
  const db = new Database(DB_PATH);
  
  const apiKeys = db.prepare('SELECT COUNT(*) as count FROM api_keys').get();
  const usageLogs = db.prepare('SELECT COUNT(*) as count FROM usage_logs').get();
  const users = db.prepare('SELECT COUNT(*) as count FROM users').get();
  
  console.log('API Keys:', apiKeys.count);
  console.log('Usage Logs:', usageLogs.count);
  console.log('Users:', users.count);
  
  db.close();
} catch (e) {
  console.error('Error:', e.message);
}
