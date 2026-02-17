import { randomBytes } from 'crypto';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { UpdateCommand, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import * as bcrypt from 'bcryptjs';
import { docClient, OLYMPICS_TABLE } from '../shared/db';
import { successResponse, errorResponse, ErrorCodes } from '../shared/response';

interface UpdateOlympicsRequest {
  eventName?: string;
  placementPoints?: Record<string, number>;
  currentYear?: boolean;
  galleryPassword?: string;
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

    const body: UpdateOlympicsRequest = JSON.parse(event.body);

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

    // If setting currentYear to true, unset other years
    if (body.currentYear === true) {
      const allYears = await docClient.send(
        new ScanCommand({
          TableName: OLYMPICS_TABLE,
        })
      );

      for (const item of allYears.Items || []) {
        if (item.year !== parseInt(year) && item.currentYear) {
          await docClient.send(
            new UpdateCommand({
              TableName: OLYMPICS_TABLE,
              Key: { year: item.year },
              UpdateExpression: 'SET currentYear = :false, updatedAt = :now',
              ExpressionAttributeValues: {
                ':false': false,
                ':now': new Date().toISOString(),
              },
            })
          );
        }
      }
    }

    // Build update expression (SET and REMOVE)
    const setUpdates: string[] = ['updatedAt = :now'];
    const removeAttrs: string[] = [];
    const attributeValues: Record<string, unknown> = {
      ':now': new Date().toISOString(),
    };

    if (body.eventName !== undefined) {
      setUpdates.push('eventName = :eventName');
      attributeValues[':eventName'] = body.eventName;
    }

    if (body.placementPoints !== undefined) {
      setUpdates.push('placementPoints = :placementPoints');
      attributeValues[':placementPoints'] = body.placementPoints;
    }

    if (body.currentYear !== undefined) {
      setUpdates.push('currentYear = :currentYear');
      attributeValues[':currentYear'] = body.currentYear;
    }

    // Gallery password: empty string = clear protection; non-empty = set hash + secret
    if (body.galleryPassword !== undefined) {
      if (body.galleryPassword === '') {
        removeAttrs.push('galleryPasswordHash', 'galleryTokenSecret');
      } else {
        const galleryPasswordHash = await bcrypt.hash(body.galleryPassword, 10);
        const galleryTokenSecret = randomBytes(32).toString('hex');
        setUpdates.push('galleryPasswordHash = :galleryPasswordHash');
        setUpdates.push('galleryTokenSecret = :galleryTokenSecret');
        attributeValues[':galleryPasswordHash'] = galleryPasswordHash;
        attributeValues[':galleryTokenSecret'] = galleryTokenSecret;
      }
    }

    let updateExpression = `SET ${setUpdates.join(', ')}`;
    if (removeAttrs.length > 0) {
      updateExpression += ` REMOVE ${removeAttrs.join(', ')}`;
    }

    const result = await docClient.send(
      new UpdateCommand({
        TableName: OLYMPICS_TABLE,
        Key: { year: parseInt(year) },
        UpdateExpression: updateExpression,
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

