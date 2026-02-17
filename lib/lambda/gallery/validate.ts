import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import * as bcrypt from 'bcryptjs';
import { docClient, OLYMPICS_TABLE } from '../shared/db';
import { successResponse, errorResponse, ErrorCodes } from '../shared/response';
import {
  createGalleryToken,
  getTokenExpiryMs,
  type OlympicsRecord,
} from '../shared/galleryAuth';

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
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

    const body = JSON.parse(event.body) as { password?: string };
    const password = body.password;

    const yearNum = parseInt(year, 10);
    if (Number.isNaN(yearNum)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR.code,
        'Invalid year',
        ErrorCodes.VALIDATION_ERROR.status
      );
    }

    const result = await docClient.send(
      new GetCommand({
        TableName: OLYMPICS_TABLE,
        Key: { year: yearNum },
      })
    );

    const olympics = result.Item as OlympicsRecord | undefined;
    if (!olympics) {
      return errorResponse(
        ErrorCodes.NOT_FOUND.code,
        `Olympics year ${year} not found`,
        ErrorCodes.NOT_FOUND.status
      );
    }

    // No gallery password set -> issue token freely (gallery unprotected)
    if (!olympics.galleryPasswordHash) {
      let secret = olympics.galleryTokenSecret;
      if (!secret || typeof secret !== 'string') {
        secret = undefined;
      }
      const expiresAt = Math.floor(getTokenExpiryMs() / 1000);
      const token = secret
        ? createGalleryToken(secret, yearNum, expiresAt)
        : '';
      return successResponse({
        token,
        expiresAt: expiresAt * 1000,
      });
    }

    if (password == null || typeof password !== 'string') {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR.code,
        'Password is required',
        ErrorCodes.VALIDATION_ERROR.status
      );
    }

    const secret = olympics.galleryTokenSecret;
    if (!secret || typeof secret !== 'string') {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR.code,
        'Gallery not configured',
        ErrorCodes.INTERNAL_ERROR.status
      );
    }

    const match = await bcrypt.compare(password, olympics.galleryPasswordHash);
    if (!match) {
      return errorResponse(
        ErrorCodes.UNAUTHORIZED.code,
        'Invalid password',
        401
      );
    }

    const expiresAt = Math.floor(getTokenExpiryMs() / 1000);
    const token = createGalleryToken(secret, yearNum, expiresAt);

    return successResponse({
      token,
      expiresAt: expiresAt * 1000,
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
