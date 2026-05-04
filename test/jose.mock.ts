import { createPublicKey, JsonWebKey, KeyObject } from 'node:crypto';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const decodeTokenPart = (
  token: string,
  index: number,
): Record<string, unknown> => {
  const tokenPart = token.split('.')[index];
  if (!tokenPart) {
    throw new Error('JWT part is missing');
  }

  const decoded: unknown = JSON.parse(
    Buffer.from(tokenPart, 'base64url').toString('utf8'),
  );
  if (!isRecord(decoded)) {
    throw new Error('JWT part is invalid');
  }

  return decoded;
};

export const decodeJwt = (token: string): Record<string, unknown> =>
  decodeTokenPart(token, 1);

export const decodeProtectedHeader = (token: string): Record<string, unknown> =>
  decodeTokenPart(token, 0);

export const importJWK = (jwk: JsonWebKey): KeyObject =>
  createPublicKey({ key: jwk, format: 'jwk' });

export const exportSPKI = (key: KeyObject): string => {
  const exportedKey = key.export({ format: 'pem', type: 'spki' });
  return typeof exportedKey === 'string' ? exportedKey : exportedKey.toString();
};
