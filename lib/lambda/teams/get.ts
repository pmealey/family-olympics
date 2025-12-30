import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
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

    const result = await docClient.send(
      new GetCommand({
        TableName: TEAMS_TABLE,
        Key: {
          year: parseInt(year),
          teamId,
        },
      })
    );

    if (!result.Item) {
      return errorResponse(
        ErrorCodes.NOT_FOUND.code,
        `Team ${teamId} not found`,
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

