import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../../../lib/lambda/media/requestUploadUrl';

jest.mock('../../../lib/lambda/shared/galleryAuth', () => ({
  verifyGalleryToken: jest.fn().mockResolvedValue({ valid: true }),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://s3.example.com/presigned-put-url'),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'abc-123-uuid'),
}));

describe('Media RequestUploadUrl Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return presigned URLs (no DB record — process Lambda creates it when original is uploaded)', async () => {
    const event = {
      pathParameters: { year: '2025' },
      body: JSON.stringify({
        fileName: 'photo.jpg',
        fileSize: 1024 * 1024,
        mimeType: 'image/jpeg',
        type: 'image',
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.uploadUrl).toBe('https://s3.example.com/presigned-put-url');
    expect(body.data.mediaId).toBe('media-abc-123-uuid');
    expect(body.data.thumbnailUploadUrl).toBe('https://s3.example.com/presigned-put-url');
    expect(body.data.displayUploadUrl).toBe('https://s3.example.com/presigned-put-url');
    expect(body.data.expiresIn).toBe(15 * 60);
  });

  it('should accept optional tags and caption and return URLs', async () => {
    const event = {
      pathParameters: { year: '2025' },
      body: JSON.stringify({
        fileName: 'photo.jpg',
        fileSize: 500,
        mimeType: 'image/jpeg',
        type: 'image',
        tags: { eventId: 'ev-1', teamId: 'team-1', persons: ['Alice'] },
        uploadedBy: 'Bob',
        caption: 'Fun day',
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.uploadUrl).toBeDefined();
    expect(body.data.mediaId).toBe('media-abc-123-uuid');
  });

  it('should return 400 if body is missing', async () => {
    const event = {
      pathParameters: { year: '2025' },
      body: undefined,
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 if required fields missing', async () => {
    const event = {
      pathParameters: { year: '2025' },
      body: JSON.stringify({
        fileName: 'photo.jpg',
        // missing fileSize, mimeType, type
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return only uploadUrl and thumbnailUploadUrl for video (no display)', async () => {
    const event = {
      pathParameters: { year: '2025' },
      body: JSON.stringify({
        fileName: 'clip.mp4',
        fileSize: 5 * 1024 * 1024,
        mimeType: 'video/mp4',
        type: 'video',
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.data.uploadUrl).toBeDefined();
    expect(body.data.thumbnailUploadUrl).toBeDefined();
    expect(body.data.displayUploadUrl).toBeUndefined();
  });

  it('should return 400 if image exceeds 20MB', async () => {
    const event = {
      pathParameters: { year: '2025' },
      body: JSON.stringify({
        fileName: 'huge.jpg',
        fileSize: 21 * 1024 * 1024,
        mimeType: 'image/jpeg',
        type: 'image',
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('20');
  });

  it('should return 400 if video exceeds 100MB', async () => {
    const event = {
      pathParameters: { year: '2025' },
      body: JSON.stringify({
        fileName: 'huge.mp4',
        fileSize: 101 * 1024 * 1024,
        mimeType: 'video/mp4',
        type: 'video',
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('100');
  });

  it('should return 400 if year is missing', async () => {
    const event = {
      pathParameters: {},
      body: JSON.stringify({
        fileName: 'photo.jpg',
        fileSize: 1000,
        mimeType: 'image/jpeg',
        type: 'image',
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
  });
});
