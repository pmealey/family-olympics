import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { docClient, TEAMS_TABLE } from '../shared/db';
import { successResponse, errorResponse, ErrorCodes } from '../shared/response';

interface CreateTeamRequest {
  name: string;
  color: 'green' | 'pink' | 'yellow' | 'orange';
  members: string[];
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

    const body: CreateTeamRequest = JSON.parse(event.body);
    const { name, color, members } = body;

    // Validation
    if (!name || !color || !members) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR.code,
        'name, color, and members are required',
        ErrorCodes.VALIDATION_ERROR.status
      );
    }

    const validColors = ['green', 'pink', 'yellow', 'orange'];
    if (!validColors.includes(color)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR.code,
        `color must be one of: ${validColors.join(', ')}`,
        ErrorCodes.VALIDATION_ERROR.status
      );
    }

    // Create team
    const now = new Date().toISOString();
    const team = {
      year: parseInt(year),
      teamId: `team-${uuidv4()}`,
      name,
      color,
      members,
      bonusPoints: 0,
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(
      new PutCommand({
        TableName: TEAMS_TABLE,
        Item: team,
      })
    );

    return successResponse(team, 201);
  } catch (error) {
    console.error('Error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR.code,
      'Internal server error',
      ErrorCodes.INTERNAL_ERROR.status
    );
  }
}

