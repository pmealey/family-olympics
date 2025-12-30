import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../../../lib/lambda/teams/list';
import { docClient } from '../../../lib/lambda/shared/db';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';

// Mock the DynamoDB client
jest.mock('../../../lib/lambda/shared/db', () => ({
  docClient: {
    send: jest.fn(),
  },
  TEAMS_TABLE: 'test-teams-table',
}));

describe('Teams List Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should list all teams for a year', async () => {
    const mockTeams = [
      {
        year: 2025,
        teamId: 'team-1',
        name: 'Team Alpha',
        color: 'green',
        members: ['Alice', 'Bob'],
        bonusPoints: 5,
      },
      {
        year: 2025,
        teamId: 'team-2',
        name: 'Team Beta',
        color: 'pink',
        members: ['Charlie', 'David'],
        bonusPoints: 0,
      },
    ];

    (docClient.send as jest.Mock).mockResolvedValueOnce({
      Items: mockTeams,
    });

    const event = {
      pathParameters: { year: '2025' },
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.teams).toHaveLength(2);
    expect(body.data.teams[0].name).toBe('Team Alpha');
    expect(body.data.teams[1].name).toBe('Team Beta');

    // Verify QueryCommand was called
    expect(docClient.send).toHaveBeenCalledWith(expect.any(QueryCommand));
  });

  it('should return empty array if no teams found', async () => {
    (docClient.send as jest.Mock).mockResolvedValueOnce({
      Items: [],
    });

    const event = {
      pathParameters: { year: '2025' },
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.teams).toHaveLength(0);
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
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});

