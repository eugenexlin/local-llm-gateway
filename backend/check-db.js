const initSqlJs = require('sql.js');
const fs = require('fs');

initSqlJs().then(SQL => {
  try {
    const db = new SQL.Database(fs.readFileSync('local_llm_gateway.db'));
    const apiKeys = db.exec('SELECT COUNT(*) FROM api_keys');
    const usageLogs = db.exec('SELECT COUNT(*) FROM usage_logs');
    const users = db.exec('SELECT COUNT(*) FROM users');
    
    console.log('API Keys:', apiKeys.length > 0 && apiKeys[0].values.length > 0 ? apiKeys[0].values[0][0] : 'table empty or error');
    console.log('Usage Logs:', usageLogs.length > 0 && usageLogs[0].values.length > 0 ? usageLogs[0].values[0][0] : 'table empty or error');
    console.log('Users:', users.length > 0 && users[0].values.length > 0 ? users[0].values[0][0] : 'table empty or error');
  } catch (e) {
    console.error('Error:', e.message);
  }
});
