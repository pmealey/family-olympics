import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../../../lib/lambda/gallery/validate';
import { docClient } from '../../../lib/lambda/shared/db';

jest.mock('../../../lib/lambda/shared/db', () => ({
  docClient: {
    send: jest.fn(),
  },
  OLYMPICS_TABLE: 'test-olympics-table',
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../../lib/lambda/shared/galleryAuth', () => ({
  createGalleryToken: jest.fn((_secret: string, year: number, expiresAt: number) =>
    `${year}.${expiresAt}.mockhmac`
  ),
  getTokenExpiryMs: jest.fn(() => Date.now() + 86400000),
}));

describe('Gallery Validate Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if year parameter is missing', async () => {
    const event = {
      pathParameters: {},
      body: JSON.stringify({ password: 'secret' }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 if body is missing', async () => {
    const event = {
      pathParameters: { year: '2025' },
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
  });

  it('should return 404 if Olympics year not found', async () => {
    (docClient.send as jest.Mock).mockResolvedValueOnce({ Item: null });

    const event = {
      pathParameters: { year: '2025' },
      body: JSON.stringify({ password: 'secret' }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(404);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('should return token when password matches', async () => {
    (docClient.send as jest.Mock).mockResolvedValueOnce({
      Item: {
        year: 2025,
        galleryPasswordHash: '$2a$10$existinghash',
        galleryTokenSecret: 'secret-key',
      },
    });

    const event = {
      pathParameters: { year: '2025' },
      body: JSON.stringify({ password: 'correct-password' }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.token).toBeDefined();
    expect(body.data.expiresAt).toBeDefined();
  });

  it('should return 401 when password does not match', async () => {
    const bcrypt = require('bcryptjs');
    bcrypt.compare.mockResolvedValueOnce(false);

    (docClient.send as jest.Mock).mockResolvedValueOnce({
      Item: {
        year: 2025,
        galleryPasswordHash: '$2a$10$existinghash',
        galleryTokenSecret: 'secret-key',
      },
    });

    const event = {
      pathParameters: { year: '2025' },
      body: JSON.stringify({ password: 'wrong-password' }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(401);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('should return token when no gallery password is set', async () => {
    (docClient.send as jest.Mock).mockResolvedValueOnce({
      Item: {
        year: 2025,
      },
    });

    const event = {
      pathParameters: { year: '2025' },
      body: JSON.stringify({}),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.expiresAt).toBeDefined();
  });
});
