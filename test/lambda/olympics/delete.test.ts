import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../../../lib/lambda/olympics/delete';
import { docClient } from '../../../lib/lambda/shared/db';
import { GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

// Mock the DynamoDB client
jest.mock('../../../lib/lambda/shared/db', () => ({
  docClient: {
    send: jest.fn(),
  },
  OLYMPICS_TABLE: 'test-olympics-table',
}));

describe('Olympics Delete Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete an existing Olympics year', async () => {
    // Mock that the year exists
    (docClient.send as jest.Mock).mockResolvedValueOnce({
      Item: { year: 2025, eventName: 'Test Olympics' },
    });
    // Mock successful delete
    (docClient.send as jest.Mock).mockResolvedValueOnce({});

    const event = {
      pathParameters: { year: '2025' },
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.deleted).toBe(true);

    // Verify GetCommand was called to check if year exists
    expect(docClient.send).toHaveBeenNthCalledWith(1, expect.any(GetCommand));
    // Verify DeleteCommand was called
    expect(docClient.send).toHaveBeenNthCalledWith(2, expect.any(DeleteCommand));
  });

  it('should return 404 if year not found', async () => {
    // Mock that the year doesn't exist
    (docClient.send as jest.Mock).mockResolvedValueOnce({ Item: null });

    const event = {
      pathParameters: { year: '2025' },
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
      pathParameters: { year: '2025' },
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});

