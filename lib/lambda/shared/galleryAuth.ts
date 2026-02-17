import { createHmac, timingSafeEqual } from 'crypto';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, OLYMPICS_TABLE } from './db';

const TOKEN_EXPIRY_SECONDS = 24 * 60 * 60; // 24 hours

export interface OlympicsRecord {
  year: number;
  galleryPasswordHash?: string;
  galleryTokenSecret?: string;
  [key: string]: unknown;
}

/**
 * Create an HMAC-signed gallery token.
 * Format: {year}.{expiresAt}.{hmac}
 */
export function createGalleryToken(
  secret: string,
  year: number,
  expiresAt: number
): string {
  const payload = `${year}.${expiresAt}`;
  const hmac = createHmac('sha256', secret).update(payload).digest('hex');
  return `${year}.${expiresAt}.${hmac}`;
}

/**
 * Get expiry timestamp (ms) for a new token.
 */
export function getTokenExpiryMs(): number {
  return Date.now() + TOKEN_EXPIRY_SECONDS * 1000;
}

export interface VerifyGalleryTokenResult {
  valid: boolean;
}

/**
 * Verify X-Gallery-Token for gallery-protected media endpoints.
 * If the Olympics record has no galleryPasswordHash, gallery is unprotected and returns valid.
 * Otherwise requires a valid, non-expired HMAC token.
 */
export async function verifyGalleryToken(
  event: APIGatewayProxyEvent
): Promise<VerifyGalleryTokenResult> {
  const yearParam = event.pathParameters?.year;
  if (!yearParam) {
    return { valid: false };
  }

  const yearNum = parseInt(yearParam, 10);
  if (Number.isNaN(yearNum)) {
    return { valid: false };
  }

  const olympicsResult = await docClient.send(
    new GetCommand({
      TableName: OLYMPICS_TABLE,
      Key: { year: yearNum },
    })
  );

  const olympics = olympicsResult.Item as OlympicsRecord | undefined;
  if (!olympics) {
    return { valid: false };
  }

  // No password set -> gallery is unprotected
  if (!olympics.galleryPasswordHash) {
    return { valid: true };
  }

  const token =
    event.headers['X-Gallery-Token'] ?? event.headers['x-gallery-token'];
  if (!token || typeof token !== 'string') {
    return { valid: false };
  }

  const secret = olympics.galleryTokenSecret;
  if (!secret || typeof secret !== 'string') {
    return { valid: false };
  }

  const parts = token.trim().split('.');
  if (parts.length !== 3) {
    return { valid: false };
  }

  const [yearStr, expiresAtStr, hmac] = parts;
  if (yearStr !== yearParam) {
    return { valid: false };
  }

  const expiresAt = parseInt(expiresAtStr, 10);
  const nowSec = Math.floor(Date.now() / 1000);
  if (Number.isNaN(expiresAt) || expiresAt < nowSec) {
    return { valid: false };
  }

  const payload = `${yearStr}.${expiresAtStr}`;
  const expectedHmac = createHmac('sha256', secret).update(payload).digest('hex');

  try {
    const hmacBuf = Buffer.from(hmac, 'hex');
    const expectedBuf = Buffer.from(expectedHmac, 'hex');
    if (hmacBuf.length !== expectedBuf.length) {
      return { valid: false };
    }
    return { valid: timingSafeEqual(hmacBuf, expectedBuf) };
  } catch {
    return { valid: false };
  }
}
