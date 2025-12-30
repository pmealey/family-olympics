import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../../../lib/lambda/scores/judge';
import { docClient } from '../../../lib/lambda/shared/db';
import { PutCommand } from '@aws-sdk/lib-dynamodb';

// Mock the DynamoDB client
jest.mock('../../../lib/lambda/shared/db', () => ({
  docClient: {
    send: jest.fn(),
  },
  SCORES_TABLE: 'test-scores-table',
}));

describe('Scores Judge Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should submit judge scores', async () => {
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

    // Verify PutCommand was called
    expect(docClient.send).toHaveBeenCalledWith(expect.any(PutCommand));
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

