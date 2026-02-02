import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { docClient, EVENTS_TABLE } from '../shared/db';
import { successResponse, errorResponse, ErrorCodes } from '../shared/response';

interface CreateEventRequest {
  name?: string;
  sponsor?: string;
  details?: string;
  location?: string;
  rulesUrl?: string;
  scoringType?: 'placement' | 'judged' | 'none';
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
    const { name, sponsor, details, location, rulesUrl, scoringType, judgedCategories, scheduledDay, scheduledTime } = body;

    // Validation
    if (!name || !name.trim()) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR.code,
        'name is required',
        ErrorCodes.VALIDATION_ERROR.status
      );
    }

    const resolvedScoringType = scoringType ?? 'placement';
    if (resolvedScoringType !== 'placement' && resolvedScoringType !== 'judged' && resolvedScoringType !== 'none') {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR.code,
        'scoringType must be "placement", "judged", or "none"',
        ErrorCodes.VALIDATION_ERROR.status
      );
    }

    // Create event
    const now = new Date().toISOString();
    const eventData: any = {
      year: parseInt(year),
      eventId: `event-${uuidv4()}`,
      scoringType: resolvedScoringType,
      name: name.trim(),
      sponsor: sponsor?.trim() || null,
      details: details?.trim() || null,
      location: location?.trim() || null,
      rulesUrl: rulesUrl?.trim() || null,
      scheduledDay: scheduledDay === 1 || scheduledDay === 2 ? scheduledDay : null,
      scheduledTime: scheduledTime?.trim() || null,
      createdAt: now,
      updatedAt: now,
    };

    if (resolvedScoringType === 'judged') {
      const categories = (judgedCategories || []).map((c) => c.trim()).filter(Boolean);
      if (categories.length > 0) {
        eventData.judgedCategories = categories;
      }
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

