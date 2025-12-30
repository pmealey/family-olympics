import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../../../lib/lambda/scores/placement';
import { docClient } from '../../../lib/lambda/shared/db';
import { PutCommand } from '@aws-sdk/lib-dynamodb';

// Mock the DynamoDB client
jest.mock('../../../lib/lambda/shared/db', () => ({
  docClient: {
    send: jest.fn(),
  },
  SCORES_TABLE: 'test-scores-table',
}));

describe('Scores Placement Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should submit placement scores', async () => {
    (docClient.send as jest.Mock).mockResolvedValue({});

    const event = {
      pathParameters: { year: '2025', eventId: 'event-1' },
      body: JSON.stringify({
        placements: [
          {
            teamId: 'team-1',
            place: 1,
            rawScore: '10.5',
            rawScoreType: 'time',
          },
          {
            teamId: 'team-2',
            place: 2,
            rawScore: '11.2',
            rawScoreType: 'time',
          },
        ],
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.scores).toHaveLength(2);

    // Verify PutCommand was called twice (once for each placement)
    expect(docClient.send).toHaveBeenCalledTimes(2);
    expect(docClient.send).toHaveBeenCalledWith(expect.any(PutCommand));
  });

  it('should return 400 if placements array is missing', async () => {
    const event = {
      pathParameters: { year: '2025', eventId: 'event-1' },
      body: JSON.stringify({}),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 if placement is missing required fields', async () => {
    const event = {
      pathParameters: { year: '2025', eventId: 'event-1' },
      body: JSON.stringify({
        placements: [
          {
            teamId: 'team-1',
            // Missing place, rawScore, rawScoreType
          },
        ],
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 if rawScoreType is invalid', async () => {
    const event = {
      pathParameters: { year: '2025', eventId: 'event-1' },
      body: JSON.stringify({
        placements: [
          {
            teamId: 'team-1',
            place: 1,
            rawScore: '10.5',
            rawScoreType: 'invalid',
          },
        ],
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
        placements: [
          {
            teamId: 'team-1',
            place: 1,
            rawScore: '10.5',
            rawScoreType: 'time',
          },
        ],
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});

