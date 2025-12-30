import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DeleteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, SCORES_TABLE } from '../shared/db';
import { successResponse, errorResponse, ErrorCodes } from '../shared/response';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const { eventId, scoreId: encodedScoreId } = event.pathParameters || {};

    if (!eventId || !encodedScoreId) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR.code,
        'EventId and scoreId parameters are required',
        ErrorCodes.VALIDATION_ERROR.status
      );
    }

    // Decode the scoreId (it may contain # characters that are URL encoded)
    const scoreId = decodeURIComponent(encodedScoreId);

    // Check if score exists
    const existing = await docClient.send(
      new GetCommand({
        TableName: SCORES_TABLE,
        Key: {
          eventId,
          scoreId,
        },
      })
    );

    if (!existing.Item) {
      return errorResponse(
        ErrorCodes.NOT_FOUND.code,
        `Score ${scoreId} not found`,
        ErrorCodes.NOT_FOUND.status
      );
    }

    await docClient.send(
      new DeleteCommand({
        TableName: SCORES_TABLE,
        Key: {
          eventId,
          scoreId,
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

