import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../../../lib/lambda/media/delete';
import { docClient } from '../../../lib/lambda/shared/db';

jest.mock('../../../lib/lambda/shared/db', () => ({
  docClient: {
    send: jest.fn(),
  },
  MEDIA_TABLE: 'test-media-table',
}));

jest.mock('@aws-sdk/client-s3', () => {
  const actual = jest.requireActual<typeof import('@aws-sdk/client-s3')>('@aws-sdk/client-s3');
  return {
    ...actual,
    S3Client: jest.fn().mockImplementation(() => ({
      send: jest.fn().mockResolvedValue({}),
    })),
  };
});

describe('Media Delete Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete media record and S3 objects', async () => {
    const item = {
      year: 2025,
      mediaId: 'media-1',
      originalKey: '2025/originals/media-1.jpg',
      thumbnailKey: '2025/thumbnails/media-1.webp',
      displayKey: '2025/display/media-1.webp',
    };
    (docClient.send as jest.Mock)
      .mockResolvedValueOnce({ Item: item })
      .mockResolvedValueOnce({});

    const event = {
      pathParameters: { year: '2025', mediaId: 'media-1' },
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.deleted).toBe(true);
    expect(docClient.send).toHaveBeenCalledTimes(2); // Get then Delete
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
});
