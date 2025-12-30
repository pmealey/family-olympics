import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../../../lib/lambda/olympics/update';
import { docClient } from '../../../lib/lambda/shared/db';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

// Mock the DynamoDB client
jest.mock('../../../lib/lambda/shared/db', () => ({
  docClient: {
    send: jest.fn(),
  },
  OLYMPICS_TABLE: 'test-olympics-table',
}));

describe('Olympics Update Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update an existing Olympics year', async () => {
    // Mock that the year exists
    (docClient.send as jest.Mock).mockResolvedValueOnce({
      Item: { year: 2025, eventName: 'Old Name', placementPoints: [10, 8, 6] },
    });
    // Mock scan for other years (when setting currentYear)
    (docClient.send as jest.Mock).mockResolvedValueOnce({
      Items: [
        { year: 2024, currentYear: true },
        { year: 2025, currentYear: false },
      ],
    });
    // Mock updates for other years (unset currentYear)
    (docClient.send as jest.Mock).mockResolvedValueOnce({});
    // Mock successful update for this year
    (docClient.send as jest.Mock).mockResolvedValueOnce({
      Attributes: {
        year: 2025,
        eventName: 'Updated Name',
        placementPoints: [12, 10, 8, 6],
        currentYear: true,
        updatedAt: new Date().toISOString(),
      },
    });

    const event = {
      pathParameters: { year: '2025' },
      body: JSON.stringify({
        eventName: 'Updated Name',
        placementPoints: [12, 10, 8, 6],
        currentYear: true,
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.year).toBe(2025);
    expect(body.data.eventName).toBe('Updated Name');
  });

  it('should return 404 if year not found', async () => {
    // Mock that the year doesn't exist
    (docClient.send as jest.Mock).mockResolvedValueOnce({ Item: null });

    const event = {
      pathParameters: { year: '2025' },
      body: JSON.stringify({
        eventName: 'Updated Name',
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(404);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('should return 400 if year parameter is missing', async () => {
    const event = {
      pathParameters: null,
      body: JSON.stringify({
        eventName: 'Updated Name',
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should update only provided fields', async () => {
    // Mock that the year exists
    (docClient.send as jest.Mock).mockResolvedValueOnce({
      Item: {
        year: 2025,
        eventName: 'Old Name',
        placementPoints: [10, 8, 6],
        currentYear: false,
      },
    });
    // Mock scan for other years (when setting currentYear)
    (docClient.send as jest.Mock).mockResolvedValueOnce({
      Items: [{ year: 2025, currentYear: false }],
    });
    // Mock successful update for this year
    (docClient.send as jest.Mock).mockResolvedValueOnce({
      Attributes: {
        year: 2025,
        eventName: 'Old Name',
        placementPoints: [10, 8, 6],
        currentYear: true,
        updatedAt: new Date().toISOString(),
      },
    });

    const event = {
      pathParameters: { year: '2025' },
      body: JSON.stringify({
        currentYear: true,
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
  });

  it('should handle DynamoDB errors gracefully', async () => {
    (docClient.send as jest.Mock).mockRejectedValueOnce(
      new Error('DynamoDB error')
    );

    const event = {
      pathParameters: { year: '2025' },
      body: JSON.stringify({
        eventName: 'Updated Name',
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});

