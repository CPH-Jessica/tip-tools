import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';

const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

export function generateEditKey(): string {
  const chars: string[] = [];
  const limit = Math.floor(256 / ALPHABET.length) * ALPHABET.length;
  while (chars.length < 12) {
    const bytes = randomBytes(16);
    for (const byte of bytes) {
      if (byte < limit) chars.push(ALPHABET[byte % ALPHABET.length]!);
      if (chars.length === 12) break;
    }
  }
  return `${chars.slice(0, 4).join('')}-${chars.slice(4, 8).join('')}-${chars.slice(8, 12).join('')}`;
}

export function normalizeEditKey(key: string): string {
  const raw = key.normalize('NFKC').trim().toLowerCase().replace(/[^abcdefghjkmnpqrstuvwxyz23456789]/g, '');
  if (raw.length !== 12) return key.normalize('NFKC').trim().toLowerCase();
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

export function hashEditKey(key: string, salt = randomBytes(16).toString('hex')): { hash: string; salt: string } {
  const hash = scryptSync(normalizeEditKey(key), Buffer.from(salt, 'hex'), 32, { N: 16384, r: 8, p: 1 }).toString('hex');
  return { hash, salt };
}

export function verifyEditKey(key: string, hash: string, salt: string): boolean {
  const next = Buffer.from(hashEditKey(key, salt).hash, 'hex');
  const expected = Buffer.from(hash, 'hex');
  return next.length === expected.length && timingSafeEqual(next, expected);
}

export function keysMatch(a: string, b: string): boolean {
  return timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());
}

function wrapKey(adminToken: string): Buffer {
  return scryptSync(adminToken, 'invisible-pen-key-wrap', 32, { N: 16384, r: 8, p: 1 });
}

export function sealSecret(adminToken: string, plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', wrapKey(adminToken), iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function openSecret(adminToken: string, sealed: string): string {
  const buf = Buffer.from(sealed, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', wrapKey(adminToken), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}
