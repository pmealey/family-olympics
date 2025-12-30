import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../../../lib/lambda/events/get';
import { docClient } from '../../../lib/lambda/shared/db';
import { GetCommand } from '@aws-sdk/lib-dynamodb';

// Mock the DynamoDB client
jest.mock('../../../lib/lambda/shared/db', () => ({
  docClient: {
    send: jest.fn(),
  },
  EVENTS_TABLE: 'test-events-table',
}));

describe('Events Get Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should get a specific event', async () => {
    const mockEvent = {
      year: 2025,
      eventId: 'event-1',
      name: 'Event Alpha',
      location: 'Park',
      rulesUrl: 'https://example.com/rules',
      scoringType: 'placement',
      status: 'upcoming',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    };

    (docClient.send as jest.Mock).mockResolvedValueOnce({
      Item: mockEvent,
    });

    const event = {
      pathParameters: { year: '2025', eventId: 'event-1' },
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Event Alpha');
    expect(body.data.location).toBe('Park');
    expect(body.data.scoringType).toBe('placement');

    // Verify GetCommand was called
    expect(docClient.send).toHaveBeenCalledWith(expect.any(GetCommand));
  });

  it('should return 404 if event not found', async () => {
    (docClient.send as jest.Mock).mockResolvedValueOnce({
      Item: null,
    });

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

