import * as fs from 'fs';
import * as path from 'path';

export default async () => {
  const testDb = path.join(__dirname, '../test_local_llm_gateway.db');
  if (fs.existsSync(testDb)) {
    fs.unlinkSync(testDb);
  }
};
