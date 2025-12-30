import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, OLYMPICS_TABLE } from '../shared/db';
import { successResponse, errorResponse, ErrorCodes } from '../shared/response';

interface CreateOlympicsRequest {
  year: number;
  eventName?: string;
  placementPoints: number[];
  currentYear?: boolean;
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    if (!event.body) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR.code,
        'Request body is required',
        ErrorCodes.VALIDATION_ERROR.status
      );
    }

    const body: CreateOlympicsRequest = JSON.parse(event.body);
    const { year, eventName, placementPoints, currentYear } = body;

    // Validation
    if (!year || !placementPoints) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR.code,
        'year and placementPoints are required',
        ErrorCodes.VALIDATION_ERROR.status
      );
    }

    if (typeof year !== 'number' || isNaN(year)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR.code,
        'year must be a valid number',
        ErrorCodes.VALIDATION_ERROR.status
      );
    }

    if (!Array.isArray(placementPoints)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR.code,
        'placementPoints must be an array',
        ErrorCodes.VALIDATION_ERROR.status
      );
    }

    // Check if year already exists
    const existing = await docClient.send(
      new GetCommand({
        TableName: OLYMPICS_TABLE,
        Key: { year },
      })
    );

    if (existing.Item) {
      return errorResponse(
        'ALREADY_EXISTS',
        `Olympics year ${year} already exists`,
        400
      );
    }

    // Create olympics record
    const now = new Date().toISOString();
    const olympics = {
      year,
      ...(eventName && { eventName }),
      placementPoints,
      currentYear: currentYear || false,
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(
      new PutCommand({
        TableName: OLYMPICS_TABLE,
        Item: olympics,
      })
    );

    return successResponse(olympics, 201);
  } catch (error) {
    console.error('Error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR.code,
      'Internal server error',
      ErrorCodes.INTERNAL_ERROR.status
    );
  }
}

