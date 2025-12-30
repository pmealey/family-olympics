import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../../../lib/lambda/scores/listByEvent';
import { docClient } from '../../../lib/lambda/shared/db';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';

// Mock the DynamoDB client
jest.mock('../../../lib/lambda/shared/db', () => ({
  docClient: {
    send: jest.fn(),
  },
  SCORES_TABLE: 'test-scores-table',
}));

describe('Scores ListByEvent Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should list all scores for an event', async () => {
    const mockScores = [
      {
        year: 2025,
        scoreId: 'score-1',
        eventId: 'event-1',
        teamId: 'team-1',
        place: 1,
      },
      {
        year: 2025,
        scoreId: 'score-2',
        eventId: 'event-1',
        teamId: 'team-2',
        place: 2,
      },
    ];

    (docClient.send as jest.Mock).mockResolvedValueOnce({
      Items: mockScores,
    });

    const event = {
      pathParameters: { year: '2025', eventId: 'event-1' },
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.scores).toHaveLength(2);
    expect(body.data.scores[0].eventId).toBe('event-1');

    // Verify QueryCommand was called
    expect(docClient.send).toHaveBeenCalledWith(expect.any(QueryCommand));
  });

  it('should return empty array if no scores found', async () => {
    (docClient.send as jest.Mock).mockResolvedValueOnce({
      Items: [],
    });

    const event = {
      pathParameters: { year: '2025', eventId: 'event-1' },
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.scores).toHaveLength(0);
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

