import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../../../lib/lambda/teams/update';
import { docClient } from '../../../lib/lambda/shared/db';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

// Mock the DynamoDB client
jest.mock('../../../lib/lambda/shared/db', () => ({
  docClient: {
    send: jest.fn(),
  },
  TEAMS_TABLE: 'test-teams-table',
}));

describe('Teams Update Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update an existing team', async () => {
    // Mock that the team exists
    (docClient.send as jest.Mock).mockResolvedValueOnce({
      Item: {
        year: 2025,
        teamId: 'team-1',
        name: 'Old Name',
        color: 'green',
        members: ['Alice'],
        bonusPoints: 0,
      },
    });
    // Mock successful update
    (docClient.send as jest.Mock).mockResolvedValueOnce({
      Attributes: {
        year: 2025,
        teamId: 'team-1',
        name: 'New Name',
        color: 'pink',
        members: ['Alice', 'Bob'],
        bonusPoints: 5,
        updatedAt: new Date().toISOString(),
      },
    });

    const event = {
      pathParameters: { year: '2025', teamId: 'team-1' },
      body: JSON.stringify({
        name: 'New Name',
        color: 'pink',
        members: ['Alice', 'Bob'],
        bonusPoints: 5,
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('New Name');
    expect(body.data.color).toBe('pink');

    // Verify GetCommand and UpdateCommand were called
    expect(docClient.send).toHaveBeenNthCalledWith(1, expect.any(GetCommand));
    expect(docClient.send).toHaveBeenNthCalledWith(2, expect.any(UpdateCommand));
  });

  it('should return 404 if team not found', async () => {
    (docClient.send as jest.Mock).mockResolvedValueOnce({ Item: null });

    const event = {
      pathParameters: { year: '2025', teamId: 'non-existent' },
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

  it('should return 400 if color is invalid', async () => {
    // Mock that the team exists
    (docClient.send as jest.Mock).mockResolvedValueOnce({
      Item: {
        year: 2025,
        teamId: 'team-1',
        name: 'Team Alpha',
        color: 'green',
      },
    });

    const event = {
      pathParameters: { year: '2025', teamId: 'team-1' },
      body: JSON.stringify({
        color: 'invalid-color',
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
      pathParameters: { year: '2025', teamId: 'team-1' },
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
});

