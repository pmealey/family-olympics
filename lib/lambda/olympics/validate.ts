import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, OLYMPICS_TABLE } from '../shared/db';
import { successResponse, errorResponse, ErrorCodes } from '../shared/response';
import { generateToken } from '../shared/auth';

interface ValidatePasswordRequest {
  password: string;
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

    const body: ValidatePasswordRequest = JSON.parse(event.body);
    const { password } = body;

    if (!password) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR.code,
        'password is required',
        ErrorCodes.VALIDATION_ERROR.status
      );
    }

    // For now, always return valid (no password protection)
    return successResponse({
      valid: true,
      token: generateToken(),
    });
  } catch (error) {
    console.error('Error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR.code,
      'Internal server error',
      ErrorCodes.INTERNAL_ERROR.status
    );
  }
}

