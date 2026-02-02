import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../../../lib/lambda/events/update';
import { docClient } from '../../../lib/lambda/shared/db';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

// Mock the DynamoDB client
jest.mock('../../../lib/lambda/shared/db', () => ({
  docClient: {
    send: jest.fn(),
  },
  EVENTS_TABLE: 'test-events-table',
}));

describe('Events Update Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update an existing event', async () => {
    // Mock that the event exists
    (docClient.send as jest.Mock).mockResolvedValueOnce({
      Item: {
        year: 2025,
        eventId: 'event-1',
        name: 'Old Name',
        location: 'Old Location',
        scoringType: 'placement',
      },
    });
    // Mock successful update
    (docClient.send as jest.Mock).mockResolvedValueOnce({
      Attributes: {
        year: 2025,
        eventId: 'event-1',
        name: 'New Name',
        location: 'New Location',
        scoringType: 'placement',
        status: 'in-progress',
        updatedAt: new Date().toISOString(),
      },
    });

    const event = {
      pathParameters: { year: '2025', eventId: 'event-1' },
      body: JSON.stringify({
        name: 'New Name',
        location: 'New Location',
        status: 'in-progress',
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('New Name');
    expect(body.data.status).toBe('in-progress');

    // Verify GetCommand and UpdateCommand were called
    expect(docClient.send).toHaveBeenNthCalledWith(1, expect.any(GetCommand));
    expect(docClient.send).toHaveBeenNthCalledWith(2, expect.any(UpdateCommand));
  });

  it('should return 404 if event not found', async () => {
    (docClient.send as jest.Mock).mockResolvedValueOnce({ Item: null });

    const event = {
      pathParameters: { year: '2025', eventId: 'non-existent' },
      body: JSON.stringify({
        name: 'New Name',
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(404);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('should return 400 if status is invalid', async () => {
    // Mock that the event exists
    (docClient.send as jest.Mock).mockResolvedValueOnce({
      Item: {
        year: 2025,
        eventId: 'event-1',
        name: 'Event Alpha',
      },
    });

    const event = {
      pathParameters: { year: '2025', eventId: 'event-1' },
      body: JSON.stringify({
        status: 'invalid-status',
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
      pathParameters: { year: '2025', eventId: 'event-1' },
      body: JSON.stringify({
        name: 'New Name',
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });

  it('should update an event scoringType to none', async () => {
    // Mock that the event exists
    (docClient.send as jest.Mock).mockResolvedValueOnce({
      Item: {
        year: 2025,
        eventId: 'event-1',
        name: 'Some Event',
        scoringType: 'placement',
      },
    });
    // Mock successful update
    (docClient.send as jest.Mock).mockResolvedValueOnce({
      Attributes: {
        year: 2025,
        eventId: 'event-1',
        name: 'Some Event',
        scoringType: 'none',
        updatedAt: new Date().toISOString(),
      },
    });

    const event = {
      pathParameters: { year: '2025', eventId: 'event-1' },
      body: JSON.stringify({
        scoringType: 'none',
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.scoringType).toBe('none');
  });

  it('should return 400 if scoringType is invalid', async () => {
    // Mock that the event exists
    (docClient.send as jest.Mock).mockResolvedValueOnce({
      Item: {
        year: 2025,
        eventId: 'event-1',
        name: 'Event Alpha',
      },
    });

    const event = {
      pathParameters: { year: '2025', eventId: 'event-1' },
      body: JSON.stringify({
        scoringType: 'invalid-type',
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should update event details field', async () => {
    // Mock that the event exists
    (docClient.send as jest.Mock).mockResolvedValueOnce({
      Item: {
        year: 2025,
        eventId: 'event-1',
        name: 'Event Alpha',
        details: null,
      },
    });
    // Mock successful update
    (docClient.send as jest.Mock).mockResolvedValueOnce({
      Attributes: {
        year: 2025,
        eventId: 'event-1',
        name: 'Event Alpha',
        details: 'New description text.',
        updatedAt: new Date().toISOString(),
      },
    });

    const event = {
      pathParameters: { year: '2025', eventId: 'event-1' },
      body: JSON.stringify({
        details: 'New description text.',
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.details).toBe('New description text.');
  });

  it('should clear details by setting to null', async () => {
    // Mock that the event exists with details
    (docClient.send as jest.Mock).mockResolvedValueOnce({
      Item: {
        year: 2025,
        eventId: 'event-1',
        name: 'Event Alpha',
        details: 'Old description',
      },
    });
    // Mock successful update
    (docClient.send as jest.Mock).mockResolvedValueOnce({
      Attributes: {
        year: 2025,
        eventId: 'event-1',
        name: 'Event Alpha',
        details: null,
        updatedAt: new Date().toISOString(),
      },
    });

    const event = {
      pathParameters: { year: '2025', eventId: 'event-1' },
      body: JSON.stringify({
        details: null,
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.details).toBeNull();
  });
});

