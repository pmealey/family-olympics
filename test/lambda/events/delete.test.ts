import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../../../lib/lambda/events/delete';
import { docClient } from '../../../lib/lambda/shared/db';
import { GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

// Mock the DynamoDB client
jest.mock('../../../lib/lambda/shared/db', () => ({
  docClient: {
    send: jest.fn(),
  },
  EVENTS_TABLE: 'test-events-table',
}));

describe('Events Delete Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete an existing event', async () => {
    // Mock that the event exists
    (docClient.send as jest.Mock).mockResolvedValueOnce({
      Item: {
        year: 2025,
        eventId: 'event-1',
        name: 'Event Alpha',
      },
    });
    // Mock successful delete
    (docClient.send as jest.Mock).mockResolvedValueOnce({});

    const event = {
      pathParameters: { year: '2025', eventId: 'event-1' },
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);

    // Verify GetCommand and DeleteCommand were called
    expect(docClient.send).toHaveBeenNthCalledWith(1, expect.any(GetCommand));
    expect(docClient.send).toHaveBeenNthCalledWith(2, expect.any(DeleteCommand));
  });

  it('should return 404 if event not found', async () => {
    (docClient.send as jest.Mock).mockResolvedValueOnce({ Item: null });

    const event = {
      pathParameters: { year: '2025', eventId: 'non-existent' },
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(404);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('should return 400 if parameters are missing', async () => {
    const event = {
      pathParameters: { year: '2025' },
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
      pathParameters: { year: '2025', eventId: 'event-1' },
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});

