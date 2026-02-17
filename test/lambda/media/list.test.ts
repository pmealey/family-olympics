import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../../../lib/lambda/media/list';
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

describe('Media List Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should list media by year and add presigned URLs', async () => {
    const items = [
      {
        year: 2025,
        mediaId: 'media-1',
        type: 'image',
        status: 'ready',
        originalKey: '2025/originals/media-1.jpg',
        thumbnailKey: '2025/thumbnails/media-1.webp',
        displayKey: '2025/display/media-1.webp',
        createdAt: '2025-01-01T00:00:00.000Z',
      },
    ];
    (docClient.send as jest.Mock).mockResolvedValueOnce({ Items: items });

    const event = {
      pathParameters: { year: '2025' },
      queryStringParameters: {},
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.media).toHaveLength(1);
    expect(body.data.media[0].mediaId).toBe('media-1');
    expect(body.data.media[0].originalUrl).toBe('https://s3.example.com/presigned-url');
    expect(body.data.media[0].thumbnailUrl).toBe('https://s3.example.com/presigned-url');
    expect(body.data.media[0].displayUrl).toBe('https://s3.example.com/presigned-url');
  });

  it('should filter by eventId when query param provided', async () => {
    (docClient.send as jest.Mock).mockResolvedValueOnce({ Items: [] });

    const event = {
      pathParameters: { year: '2025' },
      queryStringParameters: { eventId: 'ev-1' },
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    await handler(event);

    const call = (docClient.send as jest.Mock).mock.calls[0][0];
    const input = call.input ?? call;
    expect(input.TableName).toBe('test-media-table');
    expect(input.IndexName).toBe('EventIndex');
    expect(input.KeyConditionExpression).toBe('eventId = :eventId');
    expect(input.ExpressionAttributeValues).toEqual({ ':eventId': 'ev-1' });
  });

  it('should filter by teamId when query param provided', async () => {
    (docClient.send as jest.Mock).mockResolvedValueOnce({ Items: [] });

    const event = {
      pathParameters: { year: '2025' },
      queryStringParameters: { teamId: 'team-1' },
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    await handler(event);

    const call = (docClient.send as jest.Mock).mock.calls[0][0];
    const input = call.input ?? call;
    expect(input.IndexName).toBe('TeamIndex');
    expect(input.KeyConditionExpression).toBe('teamId = :teamId');
    expect(input.ExpressionAttributeValues).toEqual({ ':teamId': 'team-1' });
  });

  it('should return 400 if year is missing', async () => {
    const event = {
      pathParameters: {},
      queryStringParameters: {},
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 if year is invalid', async () => {
    const event = {
      pathParameters: { year: 'invalid' },
      queryStringParameters: {},
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
  });
});
