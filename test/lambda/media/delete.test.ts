import { APIGatewayProxyEvent } from 'aws-lambda';
import * as s3Module from '@aws-sdk/client-s3';
import { handler } from '../../../lib/lambda/media/delete';
import { docClient } from '../../../lib/lambda/shared/db';
import { verifyGalleryToken } from '../../../lib/lambda/shared/galleryAuth';

const originalEnv = process.env;
beforeAll(() => {
  process.env.MEDIA_BUCKET_NAME = 'test-media-bucket';
});
afterAll(() => {
  process.env = originalEnv;
});


jest.mock('../../../lib/lambda/shared/db', () => ({
  docClient: {
    send: jest.fn(),
  },
  MEDIA_TABLE: 'test-media-table',
}));

jest.mock('../../../lib/lambda/shared/galleryAuth', () => ({
  verifyGalleryToken: jest.fn().mockResolvedValue({ valid: true }),
}));

jest.mock('@aws-sdk/client-s3', () => {
  const actual = jest.requireActual<typeof import('@aws-sdk/client-s3')>('@aws-sdk/client-s3');
  const sendMock = jest.fn().mockResolvedValue({});
  return {
    ...actual,
    S3Client: jest.fn().mockImplementation(() => ({
      send: sendMock,
    })),
    __s3SendMock: sendMock,
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

    const s3SendMock = (s3Module as unknown as { __s3SendMock: jest.Mock }).__s3SendMock;
    expect(s3SendMock).toHaveBeenCalledTimes(1);
    const deleteCmd = s3SendMock.mock.calls[0][0];
    const input = deleteCmd.input ?? deleteCmd;
    expect(input.Delete.Objects).toHaveLength(3);
    const keys = input.Delete.Objects.map((o: { Key: string }) => o.Key).sort();
    expect(keys).toEqual([
      '2025/display/media-1.webp',
      '2025/originals/media-1.jpg',
      '2025/thumbnails/media-1.webp',
    ]);
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

  it('should return 401 when gallery token is invalid', async () => {
    (verifyGalleryToken as jest.Mock).mockResolvedValueOnce({ valid: false });

    const event = {
      pathParameters: { year: '2025', mediaId: 'media-1' },
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(401);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(docClient.send).not.toHaveBeenCalled();
  });
});
