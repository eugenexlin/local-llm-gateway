import * as crypto from 'crypto';

function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function generateApiKey(): string {
  return `lf_${crypto.randomBytes(32).toString('base64')}`;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export { hashKey, generateApiKey, hashToken };
export const hashApiKey = hashToken;
