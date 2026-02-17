import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Client } from '@aws-sdk/client-s3';
import { docClient, MEDIA_TABLE } from '../shared/db';
import { successResponse, errorResponse, ErrorCodes } from '../shared/response';

const MEDIA_BUCKET = process.env.MEDIA_BUCKET_NAME!;
const s3 = new S3Client({});
const PRESIGNED_GET_EXPIRY = 60 * 60; // 1 hour

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const { year, mediaId } = event.pathParameters || {};

    if (!year || !mediaId) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR.code,
        'Year and mediaId parameters are required',
        ErrorCodes.VALIDATION_ERROR.status
      );
    }

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
        TableName: MEDIA_TABLE,
        Key: { year: yearNum, mediaId },
      })
    );

    if (!result.Item) {
      return errorResponse(
        ErrorCodes.NOT_FOUND.code,
        `Media ${mediaId} not found`,
        ErrorCodes.NOT_FOUND.status
      );
    }

    const item = result.Item as Record<string, unknown>;
    const originalKey = item.originalKey as string | undefined;
    const thumbnailKey = item.thumbnailKey as string | undefined;
    const displayKey = item.displayKey as string | undefined;

    if (originalKey) {
      const cmd = new GetObjectCommand({ Bucket: MEDIA_BUCKET, Key: originalKey });
      item.originalUrl = await getSignedUrl(s3, cmd, { expiresIn: PRESIGNED_GET_EXPIRY });
    }
    if (thumbnailKey) {
      const cmd = new GetObjectCommand({ Bucket: MEDIA_BUCKET, Key: thumbnailKey });
      item.thumbnailUrl = await getSignedUrl(s3, cmd, { expiresIn: PRESIGNED_GET_EXPIRY });
    }
    if (displayKey) {
      const cmd = new GetObjectCommand({ Bucket: MEDIA_BUCKET, Key: displayKey });
      item.displayUrl = await getSignedUrl(s3, cmd, { expiresIn: PRESIGNED_GET_EXPIRY });
    }

    return successResponse(item);
  } catch (error) {
    console.error('Error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR.code,
      'Internal server error',
      ErrorCodes.INTERNAL_ERROR.status
    );
  }
}
