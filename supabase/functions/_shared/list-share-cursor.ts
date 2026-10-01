import { unavailable } from './list-sharing-handler.ts';

/** Signed offsets reveal no list IDs and cannot be moved to another grant. */
export function createListShareCursor(secret: string) {
  if (secret.length < 32)
    throw new Error('List cursor configuration is invalid.');
  const encoder = new TextEncoder();
  const signingKey = crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
  const bytesToHex = (bytes: Uint8Array) =>
    Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  const message = (key: string, offset: number) =>
    encoder.encode(`list-share-v1:${key}:${offset}`);
  return {
    encode: async (key: string, offset: number) => {
      const signature = await crypto.subtle.sign(
        'HMAC',
        await signingKey,
        message(key, offset),
      );
      return `${offset}.${bytesToHex(new Uint8Array(signature))}`;
    },
    decode: async (key: string, cursor: string | null) => {
      if (cursor === null) return 0;
      const match = /^([1-9][0-9]{0,5})\.([a-f0-9]{64})$/.exec(cursor);
      if (!match) throw unavailable();
      const offset = Number(match[1]);
      if (offset > 100000 || offset % 40 !== 0) throw unavailable();
      const signature = new Uint8Array(
        match[2].match(/../g)!.map((byte) => parseInt(byte, 16)),
      );
      if (
        !(await crypto.subtle.verify(
          'HMAC',
          await signingKey,
          signature,
          message(key, offset),
        ))
      )
        throw unavailable();
      return offset;
    },
  };
}
