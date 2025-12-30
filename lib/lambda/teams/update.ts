import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TEAMS_TABLE } from '../shared/db';
import { successResponse, errorResponse, ErrorCodes } from '../shared/response';

interface UpdateTeamRequest {
  name?: string;
  color?: 'green' | 'pink' | 'yellow' | 'orange';
  members?: string[];
  bonusPoints?: number;
}

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

    if (!event.body) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR.code,
        'Request body is required',
        ErrorCodes.VALIDATION_ERROR.status
      );
    }

    const body: UpdateTeamRequest = JSON.parse(event.body);

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

    // Build update expression
    const updates: string[] = [];
    const attributeValues: Record<string, any> = {
      ':now': new Date().toISOString(),
    };

    if (body.name !== undefined) {
      updates.push('name = :name');
      attributeValues[':name'] = body.name;
    }

    if (body.color !== undefined) {
      const validColors = ['green', 'pink', 'yellow', 'orange'];
      if (!validColors.includes(body.color)) {
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR.code,
          `color must be one of: ${validColors.join(', ')}`,
          ErrorCodes.VALIDATION_ERROR.status
        );
      }
      updates.push('color = :color');
      attributeValues[':color'] = body.color;
    }

    if (body.members !== undefined) {
      updates.push('members = :members');
      attributeValues[':members'] = body.members;
    }

    if (body.bonusPoints !== undefined) {
      updates.push('bonusPoints = :bonusPoints');
      attributeValues[':bonusPoints'] = body.bonusPoints;
    }

    updates.push('updatedAt = :now');

    const result = await docClient.send(
      new UpdateCommand({
        TableName: TEAMS_TABLE,
        Key: {
          year: parseInt(year),
          teamId,
        },
        UpdateExpression: `SET ${updates.join(', ')}`,
        ExpressionAttributeValues: attributeValues,
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

