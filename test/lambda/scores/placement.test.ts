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
          },
          {
            teamId: 'team-2',
            place: 2,
            rawScore: '11.2',
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

  it('should return 400 if placement is missing required fields (teamId or place)', async () => {
    const event = {
      pathParameters: { year: '2025', eventId: 'event-1' },
      body: JSON.stringify({
        placements: [
          {
            teamId: 'team-1',
            // Missing place
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

  it('should accept placements without rawScore (place-only events)', async () => {
    (docClient.send as jest.Mock).mockResolvedValue({});

    const event = {
      pathParameters: { year: '2025', eventId: 'event-1' },
      body: JSON.stringify({
        placements: [
          { teamId: 'team-1', place: 1 },
          { teamId: 'team-2', place: 2 },
          { teamId: 'team-3', place: 3 },
          { teamId: 'team-4', place: 4 },
        ],
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.scores).toHaveLength(4);
    expect(body.data.scores[0].rawScore).toBe('');
    expect(docClient.send).toHaveBeenCalledTimes(4);
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

