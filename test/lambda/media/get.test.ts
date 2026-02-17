import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../../../lib/lambda/media/get';
import { docClient } from '../../../lib/lambda/shared/db';

jest.mock('../../../lib/lambda/shared/db', () => ({
  docClient: {
    send: jest.fn(),
  },
  MEDIA_TABLE: 'test-media-table',
}));

jest.mock('../../../lib/lambda/shared/galleryAuth', () => ({
  verifyGalleryToken: jest.fn().mockResolvedValue({ valid: true }),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://s3.example.com/presigned-url'),
}));

const originalEnv = process.env;
beforeAll(() => {
  process.env.MEDIA_BUCKET_NAME = 'test-media-bucket';
});
afterAll(() => {
  process.env = originalEnv;
});

describe('Media Get Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a single media item with presigned URLs', async () => {
    const item = {
      year: 2025,
      mediaId: 'media-1',
      type: 'image',
      status: 'ready',
      originalKey: '2025/originals/media-1.jpg',
      thumbnailKey: '2025/thumbnails/media-1.webp',
      displayKey: '2025/display/media-1.webp',
      createdAt: '2025-01-01T00:00:00.000Z',
    };
    (docClient.send as jest.Mock).mockResolvedValueOnce({ Item: item });

    const event = {
      pathParameters: { year: '2025', mediaId: 'media-1' },
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.mediaId).toBe('media-1');
    expect(body.data.originalUrl).toBe('https://s3.example.com/presigned-url');
    expect(body.data.thumbnailUrl).toBe('https://s3.example.com/presigned-url');
    expect(body.data.displayUrl).toBe('https://s3.example.com/presigned-url');
  });

  it('should return 404 if media not found', async () => {
    (docClient.send as jest.Mock).mockResolvedValueOnce({ Item: null });

    const event = {
      pathParameters: { year: '2025', mediaId: 'media-nonexistent' },
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(404);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toContain('media-nonexistent');
  });

  it('should return 400 if year or mediaId missing', async () => {
    const event = {
      pathParameters: { year: '2025' },
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 if year is invalid', async () => {
    const event = {
      pathParameters: { year: 'invalid', mediaId: 'media-1' },
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
  });
});
