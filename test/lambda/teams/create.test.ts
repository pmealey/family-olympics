import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../../../lib/lambda/teams/create';
import { docClient } from '../../../lib/lambda/shared/db';

jest.mock('../../../lib/lambda/shared/db', () => ({
  docClient: {
    send: jest.fn(),
  },
  TEAMS_TABLE: 'test-teams-table',
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123'),
}));

describe('Teams Create Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a new team', async () => {
    (docClient.send as jest.Mock).mockResolvedValueOnce({});

    const event = {
      pathParameters: { year: '2025' },
      body: JSON.stringify({
        name: 'Pink Flamingos',
        color: 'pink',
        members: ['Alice', 'Bob', 'Charlie'],
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Pink Flamingos');
    expect(body.data.color).toBe('pink');
    expect(body.data.teamId).toBe('team-test-uuid-123');
    expect(body.data.bonusPoints).toBe(0);
  });

  it('should return validation error if required fields missing', async () => {
    const event = {
      pathParameters: { year: '2025' },
      body: JSON.stringify({
        name: 'Pink Flamingos',
        // Missing color and members
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return validation error if invalid color', async () => {
    const event = {
      pathParameters: { year: '2025' },
      body: JSON.stringify({
        name: 'Pink Flamingos',
        color: 'purple',
        members: ['Alice'],
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toContain('color must be one of');
  });
});

