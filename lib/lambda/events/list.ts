import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, EVENTS_TABLE } from '../shared/db';
import { successResponse, errorResponse, ErrorCodes } from '../shared/response';

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

    const result = await docClient.send(
      new QueryCommand({
        TableName: EVENTS_TABLE,
        KeyConditionExpression: '#year = :year',
        ExpressionAttributeNames: {
          '#year': 'year',
        },
        ExpressionAttributeValues: {
          ':year': parseInt(year),
        },
      })
    );

    let events = result.Items || [];

    // Apply filters from query parameters
    const { day, completed } = event.queryStringParameters || {};

    if (day) {
      events = events.filter((e) => e.scheduledDay === parseInt(day));
    }

    if (completed !== undefined) {
      const isCompleted = completed === 'true';
      events = events.filter((e) => (e.completed === true) === isCompleted);
    }

    // Sort by scheduledTime
    events.sort((a, b) => {
      // Events without time go to the end
      if (!a.scheduledTime && !b.scheduledTime) return 0;
      if (!a.scheduledTime) return 1;
      if (!b.scheduledTime) return -1;
      return a.scheduledTime.localeCompare(b.scheduledTime);
    });

    return successResponse({ events });
  } catch (error) {
    console.error('Error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR.code,
      'Internal server error',
      ErrorCodes.INTERNAL_ERROR.status
    );
  }
}

