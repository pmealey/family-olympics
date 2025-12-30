import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, EVENTS_TABLE } from '../shared/db';
import { successResponse, errorResponse, ErrorCodes } from '../shared/response';

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

    const result = await docClient.send(
      new GetCommand({
        TableName: EVENTS_TABLE,
        Key: {
          year: parseInt(year),
          eventId,
        },
      })
    );

    if (!result.Item) {
      return errorResponse(
        ErrorCodes.NOT_FOUND.code,
        `Event ${eventId} not found`,
        ErrorCodes.NOT_FOUND.status
      );
    }

    return successResponse(result.Item);
  } catch (error) {
    console.error('Error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR.code,
      'Internal server error',
      ErrorCodes.INTERNAL_ERROR.status
    );
  }
}

