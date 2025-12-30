import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../../../lib/lambda/scores/list';
import { docClient } from '../../../lib/lambda/shared/db';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';

// Mock the DynamoDB client
jest.mock('../../../lib/lambda/shared/db', () => ({
  docClient: {
    send: jest.fn(),
  },
  SCORES_TABLE: 'test-scores-table',
}));

describe('Scores List Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should list all scores for a year', async () => {
    const mockScores = [
      {
        year: 2025,
        scoreId: 'score-1',
        eventId: 'event-1',
        teamId: 'team-1',
        scoringType: 'placement',
        place: 1,
      },
      {
        year: 2025,
        scoreId: 'score-2',
        eventId: 'event-2',
        teamId: 'team-2',
        scoringType: 'judged',
      },
    ];

    (docClient.send as jest.Mock).mockResolvedValueOnce({
      Items: mockScores,
    });

    const event = {
      pathParameters: { year: '2025' },
      queryStringParameters: null,
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.scores).toHaveLength(2);

    // Verify QueryCommand was called
    expect(docClient.send).toHaveBeenCalledWith(expect.any(QueryCommand));
  });

  it('should filter scores by team', async () => {
    const mockScores = [
      {
        year: 2025,
        scoreId: 'score-1',
        eventId: 'event-1',
        teamId: 'team-1',
      },
    ];

    (docClient.send as jest.Mock).mockResolvedValueOnce({
      Items: mockScores,
    });

    const event = {
      pathParameters: { year: '2025' },
      queryStringParameters: { teamId: 'team-1' },
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.scores).toHaveLength(1);
    expect(body.data.scores[0].teamId).toBe('team-1');
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

