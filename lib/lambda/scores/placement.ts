import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, SCORES_TABLE } from '../shared/db';
import { successResponse, errorResponse, ErrorCodes } from '../shared/response';

interface PlacementScore {
  teamId: string;
  place: number;
  rawScore: string;
}

interface SubmitPlacementRequest {
  placements: PlacementScore[];
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

    const body: SubmitPlacementRequest = JSON.parse(event.body);
    const { placements } = body;

    if (!placements || !Array.isArray(placements) || placements.length === 0) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR.code,
        'placements array is required',
        ErrorCodes.VALIDATION_ERROR.status
      );
    }

    // Validate and save each placement
    const now = new Date().toISOString();
    const savedScores = [];

    for (const placement of placements) {
      const { teamId, place, rawScore } = placement;

      if (!teamId || !place || !rawScore) {
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR.code,
          'Each placement must have teamId, place, and rawScore',
          ErrorCodes.VALIDATION_ERROR.status
        );
      }

      const scoreData = {
        eventId,
        scoreId: `placement#${teamId}`,
        year: parseInt(year),
        teamId,
        place,
        rawScore,
        createdAt: now,
        updatedAt: now,
      };

      await docClient.send(
        new PutCommand({
          TableName: SCORES_TABLE,
          Item: scoreData,
        })
      );

      savedScores.push(scoreData);
    }

    return successResponse({ scores: savedScores }, 201);
  } catch (error) {
    console.error('Error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR.code,
      'Internal server error',
      ErrorCodes.INTERNAL_ERROR.status
    );
  }
}

