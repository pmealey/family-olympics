import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../../../lib/lambda/olympics/create';
import { docClient } from '../../../lib/lambda/shared/db';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

// Mock the DynamoDB client
jest.mock('../../../lib/lambda/shared/db', () => ({
  docClient: {
    send: jest.fn(),
  },
  OLYMPICS_TABLE: 'test-olympics-table',
}));

describe('Olympics Create Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a new Olympics year', async () => {
    // Mock that the year doesn't exist yet
    (docClient.send as jest.Mock).mockResolvedValueOnce({ Item: null });
    // Mock successful put
    (docClient.send as jest.Mock).mockResolvedValueOnce({});

    const event = {
      body: JSON.stringify({
        year: 2025,
        eventName: 'Family Olympics 2025',
        placementPoints: { '1': 4, '2': 3, '3': 2, '4': 1 },
        currentYear: true,
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.year).toBe(2025);
    expect(body.data.eventName).toBe('Family Olympics 2025');
    expect(body.data.placementPoints).toEqual({ '1': 4, '2': 3, '3': 2, '4': 1 });
    expect(body.data.createdAt).toBeDefined();
    expect(body.data.updatedAt).toBeDefined();

    // Verify GetCommand was called to check if year exists
    expect(docClient.send).toHaveBeenNthCalledWith(1, expect.any(GetCommand));
    // Verify PutCommand was called
    expect(docClient.send).toHaveBeenNthCalledWith(2, expect.any(PutCommand));
  });

  it('should return 400 if year already exists', async () => {
    // Mock that the year already exists
    (docClient.send as jest.Mock).mockResolvedValueOnce({
      Item: { year: 2025, eventName: 'Existing Olympics' },
    });

    const event = {
      body: JSON.stringify({
        year: 2025,
        eventName: 'Family Olympics 2025',
        placementPoints: { '1': 4, '2': 3, '3': 2, '4': 1 },
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('ALREADY_EXISTS');
  });

  it('should return 400 if required fields are missing', async () => {
    const event = {
      body: JSON.stringify({
        year: 2025,
        // Missing eventName and placementPoints
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 if year is not a valid number', async () => {
    const event = {
      body: JSON.stringify({
        year: 'invalid',
        eventName: 'Test Olympics',
        placementPoints: { '1': 4, '2': 3, '3': 2 },
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 if placementPoints is not an object', async () => {
    const event = {
      body: JSON.stringify({
        year: 2025,
        eventName: 'Test Olympics',
        placementPoints: 'invalid',
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 if placementPoints is an array', async () => {
    const event = {
      body: JSON.stringify({
        year: 2025,
        eventName: 'Test Olympics',
        placementPoints: [10, 8, 6],
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should handle DynamoDB errors gracefully', async () => {
    (docClient.send as jest.Mock).mockRejectedValueOnce(
      new Error('DynamoDB error')
    );

    const event = {
      body: JSON.stringify({
        year: 2025,
        eventName: 'Test Olympics',
        placementPoints: { '1': 4, '2': 3, '3': 2 },
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});

