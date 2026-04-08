import * as fs from 'fs';

const DB_PATH = '../local_llm_gateway.db';

console.log('Reassigning all data to eugenexlin user...\n');

const data = fs.readFileSync(DB_PATH);

const initSqlJs = require('sql.js');

initSqlJs().then((SQL: any) => {
  const db = new SQL.Database(Buffer.from(data));

  // Find the eugenexlin user
  const eugenexlin = db.exec(`SELECT id FROM users WHERE email = 'eugenexlin@gmail.com'`);
  
  if (eugenexlin.length === 0 || eugenexlin[0].values.length === 0) {
    console.log('ERROR: eugenexlin user not found!');
    return;
  }
  
  const eugenexlinId = eugenexlin[0].values[0][0] as string;
  console.log(`Found eugenexlin user: ${eugenexlinId}\n`);

  // Get all usage logs and their API keys
  console.log('Step 1: Reassigning usage logs...');
  const usageLogs = db.exec(`
    SELECT ul.id, ul.api_key_id, ul.prompt_tokens, ul.completion_tokens, 
           ul.total_tokens, ul.duration_ms, ul.timestamp
    FROM usage_logs ul
  `);
  
  if (usageLogs.length > 0 && usageLogs[0].values.length > 0) {
    const logs = usageLogs[0].values;
    console.log(`  Found ${logs.length} usage logs to reassign\n`);
    
    // Get all API keys that have usage logs
    const apiKeysWithLogs = db.exec(`
      SELECT DISTINCT api_key_id FROM usage_logs
    `);
    
    const apiKeyIds = apiKeysWithLogs[0].values.map((v: any[]) => v[0] as string);
    
    // Update each API key's user_id to eugenexlin
    apiKeyIds.forEach((apiKeyId: string) => {
      db.run(`UPDATE api_keys SET user_id = '${eugenexlinId}' WHERE id = '${apiKeyId}'`);
      console.log(`  Updated API key ${apiKeyId} -> user ${eugenexlinId}`);
    });
    
    // Update usage_logs to point to the reassignable API keys (those that now belong to eugenexlin)
    // Note: We don't need to update usage_logs.api_key_id since the API key ownership changed
    
    console.log(`\n  Successfully reassigned ${logs.length} usage logs\n`);
  }

  console.log('Step 2: Updating orphaned API keys...');
  
  // Find all API keys without a user_id or with invalid user_id
  const orphanedKeys = db.exec(`
    SELECT id, name, user_id FROM api_keys 
    WHERE user_id IS NULL OR user_id = '' OR user_id NOT LIKE 'user-%'
  `);
  
  if (orphanedKeys.length > 0 && orphanedKeys[0].values.length > 0) {
    orphanedKeys[0].values.forEach((v: any[]) => {
      const [id, name, oldUserId] = v;
      db.run(`UPDATE api_keys SET user_id = '${eugenexlinId}' WHERE id = '${id}'`);
      console.log(`  Updated API key "${name}" (was user_id: ${oldUserId}) -> ${eugenexlinId}`);
    });
  } else {
    console.log('  No orphaned API keys found');
  }

  console.log('\nStep 3: Verifying changes...');
  
  // Verify
  const finalUsers = db.exec(`
    SELECT u.id, u.email, COUNT(DISTINCT ak.id) as api_key_count,
           COUNT(DISTINCT ul.id) as usage_count
    FROM users u
    LEFT JOIN api_keys ak ON u.id = ak.user_id
    LEFT JOIN usage_logs ul ON ak.id = ul.api_key_id
    GROUP BY u.id, u.email
    ORDER BY usage_count DESC
  `);
  
  if (finalUsers.length > 0) {
    console.log('\nFinal user stats:');
    finalUsers[0].values.forEach((v: any[]) => {
      console.log(`  ${v[1]}: ${v[2]} API keys, ${v[3]} usage logs`);
    });
  }

  console.log('\nStep 4: Saving database...');
  const exported = db.export();
  const buffer = Buffer.from(exported);
  fs.writeFileSync(DB_PATH, buffer);

  console.log('\nMigration completed successfully!');
  console.log(`All data now belongs to: ${eugenexlinId} (eugenexlin@gmail.com)`);
});
