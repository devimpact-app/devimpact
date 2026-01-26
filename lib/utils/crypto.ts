import crypto from 'crypto';

export function generateCliToken(): string {
  const raw = crypto.randomBytes(24).toString('hex');
  return `devimpact_cli_${raw}`;
}

export function hashCliToken(token: string): string {
  return crypto
    .createHmac('sha256', process.env.CLI_TOKEN_SECRET!)
    .update(token)
    .digest('hex');
}

type Kid = 'v1';

function b64url(buf: Buffer) {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function unb64url(s: string) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
  return Buffer.from(s + pad, 'base64');
}

function getKey(kid: Kid) {
  const env = kid === 'v1' ? process.env.TOKEN_ENCRYPTION_KEY_V1 : undefined;
  if (!env) throw new Error('Missing TOKEN_ENCRYPTION_KEY_V1');
  const key = Buffer.from(env, 'base64');
  if (key.length !== 32)
    throw new Error('TOKEN_ENCRYPTION_KEY_V1 must be 32 bytes base64');
  return key;
}

export function encryptTokenPacked(plaintext: string, kid: Kid = 'v1') {
  const key = getKey(kid);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${kid}.${b64url(iv)}.${b64url(ct)}.${b64url(tag)}`;
}

export function decryptTokenPacked(packed: string) {
  const [kidRaw, ivB64, ctB64, tagB64] = packed.split('.');
  if (!kidRaw || !ivB64 || !ctB64 || !tagB64)
    throw new Error('Invalid token blob');

  const kid = kidRaw as Kid;
  const key = getKey(kid);

  const iv = unb64url(ivB64);
  const ct = unb64url(ctB64);
  const tag = unb64url(tagB64);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString('utf8');
}
