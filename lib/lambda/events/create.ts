import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { docClient, EVENTS_TABLE } from '../shared/db';
import { successResponse, errorResponse, ErrorCodes } from '../shared/response';

interface CreateEventRequest {
  name: string;
  location: string;
  rulesUrl: string;
  scoringType: 'placement' | 'judged';
  judgedCategories?: string[];
  scheduledDay?: number;
  scheduledTime?: string;
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const { year } = event.pathParameters || {};

    if (!year) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR.code,
        'Year parameter is required',
        ErrorCodes.VALIDATION_ERROR.status
      );
    }

    if (!event.body) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR.code,
        'Request body is required',
        ErrorCodes.VALIDATION_ERROR.status
      );
    }

    const body: CreateEventRequest = JSON.parse(event.body);
    const { name, location, rulesUrl, scoringType, judgedCategories, scheduledDay, scheduledTime } = body;

    // Validation
    if (!name || !location || !rulesUrl || !scoringType) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR.code,
        'name, location, rulesUrl, and scoringType are required',
        ErrorCodes.VALIDATION_ERROR.status
      );
    }

    if (scoringType !== 'placement' && scoringType !== 'judged') {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR.code,
        'scoringType must be either "placement" or "judged"',
        ErrorCodes.VALIDATION_ERROR.status
      );
    }

    if (scoringType === 'judged' && (!judgedCategories || judgedCategories.length === 0)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR.code,
        'judgedCategories is required for judged events',
        ErrorCodes.VALIDATION_ERROR.status
      );
    }

    // Create event
    const now = new Date().toISOString();
    const eventData: any = {
      year: parseInt(year),
      eventId: `event-${uuidv4()}`,
      name,
      location,
      rulesUrl,
      scoringType,
      scheduledDay: scheduledDay || null,
      scheduledTime: scheduledTime || null,
      status: 'upcoming',
      displayOrder: 0,
      createdAt: now,
      updatedAt: now,
    };

    if (scoringType === 'judged' && judgedCategories) {
      eventData.judgedCategories = judgedCategories;
    }

    await docClient.send(
      new PutCommand({
        TableName: EVENTS_TABLE,
        Item: eventData,
      })
    );

    return successResponse(eventData, 201);
  } catch (error) {
    console.error('Error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR.code,
      'Internal server error',
      ErrorCodes.INTERNAL_ERROR.status
    );
  }
}

