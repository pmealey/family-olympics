import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, SCORES_TABLE, EVENTS_TABLE } from '../shared/db';
import { successResponse, errorResponse, ErrorCodes } from '../shared/response';

interface SubmitJudgeScoreRequest {
  judgeName: string;
  teamId: string;
  categoryScores: Record<string, number>;
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

    const body: SubmitJudgeScoreRequest = JSON.parse(event.body);
    const { judgeName, teamId, categoryScores } = body;

    if (!judgeName || !teamId || !categoryScores) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR.code,
        'judgeName, teamId, and categoryScores are required',
        ErrorCodes.VALIDATION_ERROR.status
      );
    }

    // Check if the event is completed - judges cannot score completed events
    const eventResult = await docClient.send(
      new GetCommand({
        TableName: EVENTS_TABLE,
        Key: {
          year: parseInt(year),
          eventId,
        },
      })
    );

    if (!eventResult.Item) {
      return errorResponse(
        ErrorCodes.NOT_FOUND.code,
        `Event ${eventId} not found`,
        ErrorCodes.NOT_FOUND.status
      );
    }

    if (eventResult.Item.completed === true) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR.code,
        'Cannot submit scores for a completed event',
        ErrorCodes.VALIDATION_ERROR.status
      );
    }

    // Validate category scores (1-10)
    for (const [category, score] of Object.entries(categoryScores)) {
      if (typeof score !== 'number' || score < 1 || score > 10) {
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR.code,
          `Score for ${category} must be between 1 and 10`,
          ErrorCodes.VALIDATION_ERROR.status
        );
      }
    }

    const now = new Date().toISOString();
    const scoreData = {
      eventId,
      scoreId: `judge#${judgeName}#${teamId}`,
      year: parseInt(year),
      teamId,
      judgeName,
      categoryScores,
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(
      new PutCommand({
        TableName: SCORES_TABLE,
        Item: scoreData,
      })
    );

    return successResponse(scoreData, 201);
  } catch (error) {
    console.error('Error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR.code,
      'Internal server error',
      ErrorCodes.INTERNAL_ERROR.status
    );
  }
}

