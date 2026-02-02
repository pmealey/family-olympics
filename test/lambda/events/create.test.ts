import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../../../lib/lambda/events/create';
import { docClient } from '../../../lib/lambda/shared/db';
import { PutCommand } from '@aws-sdk/lib-dynamodb';

// Mock the DynamoDB client and uuid
jest.mock('../../../lib/lambda/shared/db', () => ({
  docClient: {
    send: jest.fn(),
  },
  EVENTS_TABLE: 'test-events-table',
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid'),
}));

describe('Events Create Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a new placement event', async () => {
    (docClient.send as jest.Mock).mockResolvedValueOnce({});

    const event = {
      pathParameters: { year: '2025' },
      body: JSON.stringify({
        name: 'Event Alpha',
        sponsor: 'Acme Co.',
        location: 'Park',
        rulesUrl: 'https://example.com/rules',
        scoringType: 'placement',
        scheduledDay: 1,
        scheduledTime: '10:00 AM',
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Event Alpha');
    expect(body.data.sponsor).toBe('Acme Co.');
    expect(body.data.location).toBe('Park');
    expect(body.data.scoringType).toBe('placement');
    expect(body.data.eventId).toBe('event-test-uuid');

    // Verify PutCommand was called
    expect(docClient.send).toHaveBeenCalledWith(expect.any(PutCommand));
  });

  it('should create an event with only a name (defaults scoringType to placement)', async () => {
    (docClient.send as jest.Mock).mockResolvedValueOnce({});

    const event = {
      pathParameters: { year: '2025' },
      body: JSON.stringify({
        name: 'Barebones Event',
        // scoringType omitted
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Barebones Event');
    expect(body.data.scoringType).toBe('placement');
  });

  it('should create a new judged event with categories', async () => {
    (docClient.send as jest.Mock).mockResolvedValueOnce({});

    const event = {
      pathParameters: { year: '2025' },
      body: JSON.stringify({
        name: 'Talent Show',
        location: 'Theater',
        rulesUrl: 'https://example.com/rules',
        scoringType: 'judged',
        judgedCategories: ['Creativity', 'Execution', 'Presentation'],
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.scoringType).toBe('judged');
    expect(body.data.judgedCategories).toEqual([
      'Creativity',
      'Execution',
      'Presentation',
    ]);
  });

  it('should return 400 if required fields are missing', async () => {
    const event = {
      pathParameters: { year: '2025' },
      body: JSON.stringify({
        // Missing name
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 if scoringType is invalid', async () => {
    const event = {
      pathParameters: { year: '2025' },
      body: JSON.stringify({
        name: 'Event Alpha',
        location: 'Park',
        rulesUrl: 'https://example.com/rules',
        scoringType: 'invalid',
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should allow judged event with no categories', async () => {
    (docClient.send as jest.Mock).mockResolvedValueOnce({});

    const event = {
      pathParameters: { year: '2025' },
      body: JSON.stringify({
        name: 'Judged Event',
        scoringType: 'judged',
        // judgedCategories omitted
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.scoringType).toBe('judged');
    expect(body.data.judgedCategories).toBeUndefined();
  });

  it('should handle DynamoDB errors gracefully', async () => {
    (docClient.send as jest.Mock).mockRejectedValueOnce(
      new Error('DynamoDB error')
    );

    const event = {
      pathParameters: { year: '2025' },
      body: JSON.stringify({
        name: 'Event Alpha',
        location: 'Park',
        rulesUrl: 'https://example.com/rules',
        scoringType: 'placement',
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });

  it('should create a non-scoring event with scoringType none', async () => {
    (docClient.send as jest.Mock).mockResolvedValueOnce({});

    const event = {
      pathParameters: { year: '2025' },
      body: JSON.stringify({
        name: 'Opening Ceremony',
        location: 'Main Stage',
        scoringType: 'none',
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Opening Ceremony');
    expect(body.data.scoringType).toBe('none');
  });
});

