import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../../../lib/lambda/olympics/get';
import { docClient } from '../../../lib/lambda/shared/db';
import { GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

// Mock the DynamoDB client
jest.mock('../../../lib/lambda/shared/db', () => ({
  docClient: {
    send: jest.fn(),
  },
  OLYMPICS_TABLE: 'test-olympics-table',
}));

describe('Olympics Get Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /olympics/current', () => {
    it('should return current year configuration', async () => {
      const mockOlympics = {
        year: 2025,
        placementPoints: [10, 8, 6, 4, 2, 1],
        currentYear: true,
      };

      (docClient.send as jest.Mock).mockResolvedValueOnce({
        Items: [mockOlympics],
      });

      const event = {
        path: '/olympics/current',
        pathParameters: null,
      } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.year).toBe(2025);
    });

    it('should return 404 if no current year configured', async () => {
      (docClient.send as jest.Mock).mockResolvedValueOnce({
        Items: [],
      });

      const event = {
        path: '/olympics/current',
        pathParameters: null,
      } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /olympics/:year', () => {
    it('should return specific year configuration', async () => {
      const mockOlympics = {
        year: 2025,
        placementPoints: [10, 8, 6, 4, 2, 1],
        currentYear: true,
      };

      (docClient.send as jest.Mock).mockResolvedValueOnce({
        Item: mockOlympics,
      });

      const event = {
        path: '/olympics/2025',
        pathParameters: { year: '2025' },
      } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.year).toBe(2025);
    });

    it('should return 404 if year not found', async () => {
      (docClient.send as jest.Mock).mockResolvedValueOnce({
        Item: null,
      });

      const event = {
        path: '/olympics/2025',
        pathParameters: { year: '2025' },
      } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /olympics', () => {
    it('should return all years', async () => {
      const mockYears = [
        { year: 2025, currentYear: true },
        { year: 2023, currentYear: false },
      ];

      (docClient.send as jest.Mock).mockResolvedValueOnce({
        Items: mockYears,
      });

      const event = {
        path: '/olympics',
        pathParameters: null,
      } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.years).toHaveLength(2);
      expect(body.data.years[0].year).toBe(2025);
    });
  });
});

