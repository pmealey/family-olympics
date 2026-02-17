import { APIGatewayProxyEvent } from 'aws-lambda';
import { createGalleryToken, verifyGalleryToken } from '../../../lib/lambda/shared/galleryAuth';
import { docClient } from '../../../lib/lambda/shared/db';

jest.mock('../../../lib/lambda/shared/db', () => ({
  docClient: {
    send: jest.fn(),
  },
  OLYMPICS_TABLE: 'test-olympics-table',
}));

describe('galleryAuth', () => {
  describe('createGalleryToken', () => {
    it('should create token with format year.expiresAt.hmac', () => {
      const secret = 'test-secret';
      const year = 2025;
      const expiresAt = 1000000000;
      const token = createGalleryToken(secret, year, expiresAt);
      const parts = token.split('.');
      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe('2025');
      expect(parts[1]).toBe('1000000000');
      expect(parts[2]).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce different HMAC for different payloads', () => {
      const secret = 'test-secret';
      const token1 = createGalleryToken(secret, 2025, 1000);
      const token2 = createGalleryToken(secret, 2025, 2000);
      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyGalleryToken', () => {
    const secret = 'my-secret-key';
    const year = 2025;
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const validToken = createGalleryToken(secret, year, expiresAt);

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return valid when Olympics has no galleryPasswordHash', async () => {
      (docClient.send as jest.Mock).mockResolvedValueOnce({
        Item: { year: 2025 },
      });

      const event = {
        pathParameters: { year: '2025' },
      } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

      const result = await verifyGalleryToken(event);
      expect(result.valid).toBe(true);
    });

    it('should return invalid when token is missing and password is set', async () => {
      (docClient.send as jest.Mock).mockResolvedValueOnce({
        Item: {
          year: 2025,
          galleryPasswordHash: '$2a$10$hash',
          galleryTokenSecret: secret,
        },
      });

      const event = {
        pathParameters: { year: '2025' },
        headers: {},
      } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

      const result = await verifyGalleryToken(event);
      expect(result.valid).toBe(false);
    });

    it('should return valid for correct token', async () => {
      (docClient.send as jest.Mock).mockResolvedValueOnce({
        Item: {
          year: 2025,
          galleryPasswordHash: '$2a$10$hash',
          galleryTokenSecret: secret,
        },
      });

      const event = {
        pathParameters: { year: '2025' },
        headers: { 'X-Gallery-Token': validToken },
      } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

      const result = await verifyGalleryToken(event);
      expect(result.valid).toBe(true);
    });

    it('should return invalid for expired token', async () => {
      const expiredAt = Math.floor(Date.now() / 1000) - 100;
      const expiredToken = createGalleryToken(secret, year, expiredAt);

      (docClient.send as jest.Mock).mockResolvedValueOnce({
        Item: {
          year: 2025,
          galleryPasswordHash: '$2a$10$hash',
          galleryTokenSecret: secret,
        },
      });

      const event = {
        pathParameters: { year: '2025' },
        headers: { 'X-Gallery-Token': expiredToken },
      } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

      const result = await verifyGalleryToken(event);
      expect(result.valid).toBe(false);
    });

    it('should return invalid for wrong year in token', async () => {
      const wrongYearToken = createGalleryToken(secret, 2024, expiresAt);

      (docClient.send as jest.Mock).mockResolvedValueOnce({
        Item: {
          year: 2025,
          galleryPasswordHash: '$2a$10$hash',
          galleryTokenSecret: secret,
        },
      });

      const event = {
        pathParameters: { year: '2025' },
        headers: { 'X-Gallery-Token': wrongYearToken },
      } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

      const result = await verifyGalleryToken(event);
      expect(result.valid).toBe(false);
    });

    it('should return invalid when year parameter is missing', async () => {
      const event = {
        pathParameters: {},
      } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

      const result = await verifyGalleryToken(event);
      expect(result.valid).toBe(false);
      expect(docClient.send).not.toHaveBeenCalled();
    });
  });
});
