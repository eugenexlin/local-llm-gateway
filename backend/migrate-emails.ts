import * as fs from 'fs';
import * as path from 'path';

// Default to root directory database (where actual data is stored)
const ROOT_DIR = path.join(__dirname, '..');
const DB_PATH = process.env.DATABASE_PATH || path.join(ROOT_DIR, 'local_llm_gateway.db');

console.log('Starting email normalization migration...\n');

const data = fs.readFileSync(DB_PATH);

const initSqlJs = require('sql.js');

initSqlJs().then((SQL: any) => {
  const db = new SQL.Database(Buffer.from(data));

  console.log('Step 1: Finding duplicate users...\n');

  const usersResult = db.exec(`
    SELECT id, email, created_at, 
           (SELECT COUNT(*) FROM usage_logs WHERE api_key_id IN (
             SELECT id FROM api_keys WHERE user_id = users.id
           )) as usage_count
    FROM users
    ORDER BY LOWER(email), created_at ASC
  `);

  if (usersResult.length === 0) {
    console.log('No users found in database.');
    return;
  }

  const columns = usersResult[0].columns;
  const values = usersResult[0].values;
  
  const users: any[] = [];
  values.forEach((row: any[]) => {
    const user: any = {};
    columns.forEach((col: string, i: number) => {
      user[col] = row[i];
    });
    users.push(user);
  });

  const emailGroups: Map<string, typeof users> = new Map();
  users.forEach(user => {
    const key = user.email.toLowerCase();
    if (!emailGroups.has(key)) {
      emailGroups.set(key, []);
    }
    emailGroups.get(key)!.push(user);
  });

  let duplicatesFound = false;
  let usersMerged = 0;
  let logsDeleted = 0;

  emailGroups.forEach((group, normalizedEmail) => {
    if (group.length > 1) {
      duplicatesFound = true;
      console.log(`Found ${group.length} users with email "${normalizedEmail}":`);
      
      group.forEach(u => {
        console.log(`  - ${u.id}: ${u.email} (created: ${u.created_at}, usage_count: ${u.usage_count})`);
      });

      const keptUser = group.reduce((best, current) => {
        if (current.usage_count > best.usage_count) return current;
        if (current.usage_count === best.usage_count && new Date(current.created_at) < new Date(best.created_at)) {
          return current;
        }
        return best;
      });

      console.log(`Keeping user: ${keptUser.id}\n`);

      group.forEach(user => {
        if (user.id !== keptUser.id) {
          const apiKeysResult = db.exec(`SELECT id FROM api_keys WHERE user_id = '${user.id}'`);
          if (apiKeysResult.length > 0 && apiKeysResult[0].values.length > 0) {
            const apiKeys = apiKeysResult[0].values.map((v: any[]) => v[0] as string);
            
            apiKeys.forEach((apiKeyId: string) => {
              const logsResult = db.exec(`SELECT id FROM usage_logs WHERE api_key_id = '${apiKeyId}'`);
              if (logsResult.length > 0 && logsResult[0].values.length > 0) {
                logsDeleted += logsResult[0].values.length;
                logsResult[0].values.forEach((v: any[]) => {
                  const logId = v[0] as string;
                  db.run(`DELETE FROM usage_logs WHERE id = '${logId}'`);
                });
              }
            });

            db.run(`DELETE FROM api_keys WHERE user_id = '${user.id}'`);
          }

          db.run(`DELETE FROM users WHERE id = '${user.id}'`);
          console.log(`Merged user ${user.id} into ${keptUser.id}`);
          usersMerged++;
        }
      });
      console.log('');
    }
  });

  if (!duplicatesFound) {
    console.log('No duplicate users found.\n');
  } else {
    console.log(`Merged ${usersMerged} duplicate users.\n`);
  }

  console.log('Step 2: Normalizing all email addresses to lowercase...\n');

  const normalizeResult = db.exec(`
    SELECT id, email FROM users WHERE email != LOWER(email)
  `);

  if (normalizeResult.length > 0 && normalizeResult[0].values.length > 0) {
    const normalizedUsers = normalizeResult[0].values;
    normalizedUsers.forEach((row: any[]) => {
      const [id, email] = row;
      const lowerEmail = email.toLowerCase();
      db.run(`UPDATE users SET email = '${lowerEmail}' WHERE id = '${id}'`);
      console.log(`Normalized: ${email} -> ${lowerEmail}`);
    });
    console.log(`\nNormalized ${normalizedUsers.length} email addresses.\n`);
  } else {
    console.log('All emails already normalized.\n');
  }

  console.log('Step 3: Saving database...\n');
  
  const exportedData = db.export();
  const buffer = Buffer.from(exportedData);
  fs.writeFileSync(DB_PATH, buffer);

  console.log('Migration completed successfully!');
  console.log(`- Database saved to: ${DB_PATH}`);
});
