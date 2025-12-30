import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../../../lib/lambda/olympics/validate';

describe('Olympics Validate Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return success (password validation removed)', async () => {
    const event = {
      pathParameters: { year: '2025' },
      body: JSON.stringify({
        password: 'any-password',
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.valid).toBe(true);
  });

  it('should return 400 if year parameter is missing', async () => {
    const event = {
      pathParameters: null,
      body: JSON.stringify({
        password: 'test',
      }),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 if password is missing', async () => {
    const event = {
      pathParameters: { year: '2025' },
      body: JSON.stringify({}),
    } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});

