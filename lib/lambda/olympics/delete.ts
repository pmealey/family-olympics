import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DeleteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, OLYMPICS_TABLE } from '../shared/db';
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

    // Check if olympics year exists
    const existing = await docClient.send(
      new GetCommand({
        TableName: OLYMPICS_TABLE,
        Key: { year: parseInt(year) },
      })
    );

    if (!existing.Item) {
      return errorResponse(
        ErrorCodes.NOT_FOUND.code,
        `Olympics year ${year} not found`,
        ErrorCodes.NOT_FOUND.status
      );
    }

    // Delete the olympics year
    await docClient.send(
      new DeleteCommand({
        TableName: OLYMPICS_TABLE,
        Key: { year: parseInt(year) },
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

