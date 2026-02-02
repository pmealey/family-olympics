import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../../../lib/lambda/scores/judge';
import { docClient } from '../../../lib/lambda/shared/db';
import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

// Mock the DynamoDB client
jest.mock('../../../lib/lambda/shared/db', () => ({
  docClient: {
    send: jest.fn(),
  },
  SCORES_TABLE: 'test-scores-table',
  EVENTS_TABLE: 'test-events-table',
}));

describe('Scores Judge Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should submit judge scores', async () => {
    // Mock event exists and is not completed
    (docClient.send as jest.Mock).mockResolvedValueOnce({
      Item: { year: 2025, eventId: 'event-1', completed: false },
    });
    // Mock successful score submission
    (docClient.send as jest.Mock).mockResolvedValueOnce({});

    const event = {
      pathParameters: { year: '2025', eventId: 'event-1' },
      body: JSON.stringify({
        judgeName: 'Judge Smith',
        teamId: 'team-1',
        categoryScores: {
          Creativity: 8,
          Execution: 9,
          Presentation: 7,
        },
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.judgeName).toBe('Judge Smith');
    expect(body.data.teamId).toBe('team-1');
    expect(body.data.categoryScores).toEqual({
      Creativity: 8,
      Execution: 9,
      Presentation: 7,
    });

    // Verify GetCommand and PutCommand were called
    expect(docClient.send).toHaveBeenNthCalledWith(1, expect.any(GetCommand));
    expect(docClient.send).toHaveBeenNthCalledWith(2, expect.any(PutCommand));
  });

  it('should reject scores for completed events', async () => {
    // Mock event exists and is completed
    (docClient.send as jest.Mock).mockResolvedValueOnce({
      Item: { year: 2025, eventId: 'event-1', completed: true },
    });

    const event = {
      pathParameters: { year: '2025', eventId: 'event-1' },
      body: JSON.stringify({
        judgeName: 'Judge Smith',
        teamId: 'team-1',
        categoryScores: {
          Creativity: 8,
          Execution: 9,
          Presentation: 7,
        },
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toContain('completed');
  });

  it('should return 404 if event not found', async () => {
    // Mock event not found
    (docClient.send as jest.Mock).mockResolvedValueOnce({ Item: null });

    const event = {
      pathParameters: { year: '2025', eventId: 'non-existent' },
      body: JSON.stringify({
        judgeName: 'Judge Smith',
        teamId: 'team-1',
        categoryScores: { Creativity: 8 },
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(404);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('should return 400 if required fields are missing', async () => {
    const event = {
      pathParameters: { year: '2025', eventId: 'event-1' },
      body: JSON.stringify({
        judgeName: 'Judge Smith',
        // Missing teamId and categoryScores
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 if category score is out of range', async () => {
    // Mock event exists and is not completed
    (docClient.send as jest.Mock).mockResolvedValueOnce({
      Item: { year: 2025, eventId: 'event-1', completed: false },
    });

    const event = {
      pathParameters: { year: '2025', eventId: 'event-1' },
      body: JSON.stringify({
        judgeName: 'Judge Smith',
        teamId: 'team-1',
        categoryScores: {
          Creativity: 11, // Invalid: > 10
          Execution: 9,
        },
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 if category score is less than 1', async () => {
    // Mock event exists and is not completed
    (docClient.send as jest.Mock).mockResolvedValueOnce({
      Item: { year: 2025, eventId: 'event-1', completed: false },
    });

    const event = {
      pathParameters: { year: '2025', eventId: 'event-1' },
      body: JSON.stringify({
        judgeName: 'Judge Smith',
        teamId: 'team-1',
        categoryScores: {
          Creativity: 0, // Invalid: < 1
          Execution: 9,
        },
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 if parameters are missing', async () => {
    const event = {
      pathParameters: { year: '2025' },
      body: JSON.stringify({
        judgeName: 'Judge Smith',
        teamId: 'team-1',
        categoryScores: { Creativity: 8 },
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
        judgeName: 'Judge Smith',
        teamId: 'team-1',
        categoryScores: { Creativity: 8 },
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});

