import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../../../lib/lambda/events/list';
import { docClient } from '../../../lib/lambda/shared/db';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';

// Mock the DynamoDB client
jest.mock('../../../lib/lambda/shared/db', () => ({
  docClient: {
    send: jest.fn(),
  },
  EVENTS_TABLE: 'test-events-table',
}));

describe('Events List Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should list all events for a year', async () => {
    const mockEvents = [
      {
        year: 2025,
        eventId: 'event-1',
        name: 'Event Alpha',
        location: 'Park',
        scoringType: 'placement',
        status: 'upcoming',
        displayOrder: 1,
      },
      {
        year: 2025,
        eventId: 'event-2',
        name: 'Event Beta',
        location: 'Stadium',
        scoringType: 'judged',
        status: 'completed',
        displayOrder: 2,
      },
    ];

    (docClient.send as jest.Mock).mockResolvedValueOnce({
      Items: mockEvents,
    });

    const event = {
      pathParameters: { year: '2025' },
      queryStringParameters: null,
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.events).toHaveLength(2);

    // Verify QueryCommand was called
    expect(docClient.send).toHaveBeenCalledWith(expect.any(QueryCommand));
  });

  it('should filter events by day', async () => {
    const mockEvents = [
      {
        year: 2025,
        eventId: 'event-1',
        name: 'Event Alpha',
        scheduledDay: 1,
        displayOrder: 1,
      },
      {
        year: 2025,
        eventId: 'event-2',
        name: 'Event Beta',
        scheduledDay: 2,
        displayOrder: 2,
      },
    ];

    (docClient.send as jest.Mock).mockResolvedValueOnce({
      Items: mockEvents,
    });

    const event = {
      pathParameters: { year: '2025' },
      queryStringParameters: { day: '1' },
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.events).toHaveLength(1);
    expect(body.data.events[0].scheduledDay).toBe(1);
  });

  it('should filter events by status', async () => {
    const mockEvents = [
      {
        year: 2025,
        eventId: 'event-1',
        name: 'Event Alpha',
        status: 'upcoming',
        displayOrder: 1,
      },
      {
        year: 2025,
        eventId: 'event-2',
        name: 'Event Beta',
        status: 'completed',
        displayOrder: 2,
      },
    ];

    (docClient.send as jest.Mock).mockResolvedValueOnce({
      Items: mockEvents,
    });

    const event = {
      pathParameters: { year: '2025' },
      queryStringParameters: { status: 'upcoming' },
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.events).toHaveLength(1);
    expect(body.data.events[0].status).toBe('upcoming');
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
      queryStringParameters: null,
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});

