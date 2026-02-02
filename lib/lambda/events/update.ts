import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, EVENTS_TABLE } from '../shared/db';
import { successResponse, errorResponse, ErrorCodes } from '../shared/response';

interface UpdateEventRequest {
  name?: string;
  sponsor?: string | null;
  details?: string | null;
  location?: string;
  rulesUrl?: string;
  scoringType?: 'placement' | 'judged' | 'none';
  judgedCategories?: string[];
  scheduledDay?: number;
  scheduledTime?: string;
  status?: 'upcoming' | 'in-progress' | 'completed';
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const { year, eventId } = event.pathParameters || {};

    if (!year || !eventId) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR.code,
        'Year and eventId parameters are required',
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

    const body: UpdateEventRequest = JSON.parse(event.body);

    // Check if event exists
    const existing = await docClient.send(
      new GetCommand({
        TableName: EVENTS_TABLE,
        Key: {
          year: parseInt(year),
          eventId,
        },
      })
    );

    if (!existing.Item) {
      return errorResponse(
        ErrorCodes.NOT_FOUND.code,
        `Event ${eventId} not found`,
        ErrorCodes.NOT_FOUND.status
      );
    }

    // Build update expression
    const updates: string[] = [];
    const attributeValues: Record<string, any> = {
      ':now': new Date().toISOString(),
    };
    const attributeNames: Record<string, string> = {};

    if (body.name !== undefined) {
      updates.push('#name = :name');
      attributeValues[':name'] = body.name;
      attributeNames['#name'] = 'name';
    }

    if (body.sponsor !== undefined) {
      updates.push('sponsor = :sponsor');
      attributeValues[':sponsor'] = body.sponsor;
    }

    if (body.details !== undefined) {
      updates.push('details = :details');
      attributeValues[':details'] = body.details;
    }

    if (body.location !== undefined) {
      updates.push('#location = :location');
      attributeValues[':location'] = body.location;
      attributeNames['#location'] = 'location';
    }

    if (body.rulesUrl !== undefined) {
      updates.push('rulesUrl = :rulesUrl');
      attributeValues[':rulesUrl'] = body.rulesUrl;
    }

    if (body.scoringType !== undefined) {
      if (body.scoringType !== 'placement' && body.scoringType !== 'judged' && body.scoringType !== 'none') {
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR.code,
          'scoringType must be "placement", "judged", or "none"',
          ErrorCodes.VALIDATION_ERROR.status
        );
      }
      updates.push('scoringType = :scoringType');
      attributeValues[':scoringType'] = body.scoringType;
    }

    if (body.judgedCategories !== undefined) {
      updates.push('judgedCategories = :judgedCategories');
      attributeValues[':judgedCategories'] = body.judgedCategories;
    }

    if (body.scheduledDay !== undefined) {
      updates.push('scheduledDay = :scheduledDay');
      attributeValues[':scheduledDay'] = body.scheduledDay;
    }

    if (body.scheduledTime !== undefined) {
      updates.push('scheduledTime = :scheduledTime');
      attributeValues[':scheduledTime'] = body.scheduledTime;
    }

    if (body.status !== undefined) {
      const validStatuses = ['upcoming', 'in-progress', 'completed'];
      if (!validStatuses.includes(body.status)) {
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR.code,
          `status must be one of: ${validStatuses.join(', ')}`,
          ErrorCodes.VALIDATION_ERROR.status
        );
      }
      updates.push('#status = :status');
      attributeValues[':status'] = body.status;
      attributeNames['#status'] = 'status';
    }

    updates.push('updatedAt = :now');

    const updateExpression = `SET ${updates.join(', ')}`;
    const expressionAttributeNames = Object.keys(attributeNames).length > 0 ? attributeNames : undefined;

    const result = await docClient.send(
      new UpdateCommand({
        TableName: EVENTS_TABLE,
        Key: {
          year: parseInt(year),
          eventId,
        },
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: attributeValues,
        ExpressionAttributeNames: expressionAttributeNames,
        ReturnValues: 'ALL_NEW',
      })
    );

    return successResponse(result.Attributes);
  } catch (error) {
    console.error('Error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR.code,
      'Internal server error',
      ErrorCodes.INTERNAL_ERROR.status
    );
  }
}

