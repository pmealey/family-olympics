import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DeleteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TEAMS_TABLE } from '../shared/db';
import { successResponse, errorResponse, ErrorCodes } from '../shared/response';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const { year, teamId } = event.pathParameters || {};

    if (!year || !teamId) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR.code,
        'Year and teamId parameters are required',
        ErrorCodes.VALIDATION_ERROR.status
      );
    }

    // Check if team exists
    const existing = await docClient.send(
      new GetCommand({
        TableName: TEAMS_TABLE,
        Key: {
          year: parseInt(year),
          teamId,
        },
      })
    );

    if (!existing.Item) {
      return errorResponse(
        ErrorCodes.NOT_FOUND.code,
        `Team ${teamId} not found`,
        ErrorCodes.NOT_FOUND.status
      );
    }

    await docClient.send(
      new DeleteCommand({
        TableName: TEAMS_TABLE,
        Key: {
          year: parseInt(year),
          teamId,
        },
      })
    );

    return successResponse({ deleted: true });
  } catch (error) {
    console.error('Error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR.code,
      'Internal server error',
      ErrorCodes.INTERNAL_ERROR.status
    );
  }
}

