import crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12; // recommended for GCM
const KEY = process.env.MJ_SECRET_KEY || 'dev-secret-key-32-bytes-length!!!'; // must be 32 bytes in prod

function getKey() {
  // ensure 32 bytes
  return crypto.createHash('sha256').update(KEY).digest();
}

export function encrypt(text: string) {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decrypt(payloadB64: string) {
  const data = Buffer.from(payloadB64, 'base64');
  const iv = data.slice(0, IV_LEN);
  const tag = data.slice(IV_LEN, IV_LEN + 16);
  const encrypted = data.slice(IV_LEN + 16);
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}
