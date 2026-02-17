import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../../../lib/lambda/media/requestUploadUrl';
import { docClient } from '../../../lib/lambda/shared/db';

jest.mock('../../../lib/lambda/shared/db', () => ({
  docClient: {
    send: jest.fn(),
  },
  MEDIA_TABLE: 'test-media-table',
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

  it('should return presigned URL and create pending media record', async () => {
    (docClient.send as jest.Mock).mockResolvedValueOnce({});

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
    expect(body.data.expiresIn).toBe(15 * 60);
    expect(docClient.send).toHaveBeenCalledTimes(1);
  });

  it('should accept optional tags and caption', async () => {
    (docClient.send as jest.Mock).mockResolvedValueOnce({});

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
    const sendCall = (docClient.send as jest.Mock).mock.calls[0][0];
    const item = sendCall.input?.Item ?? sendCall.Item;
    expect(item).toBeDefined();
    expect(item.year).toBe(2025);
    expect(item.type).toBe('image');
    expect(item.status).toBe('pending');
    expect(item.eventId).toBe('ev-1');
    expect(item.teamId).toBe('team-1');
    expect(item.uploadedBy).toBe('Bob');
    expect(item.caption).toBe('Fun day');
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
    expect(docClient.send).not.toHaveBeenCalled();
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
