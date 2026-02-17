import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DeleteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { DeleteObjectsCommand, S3Client } from '@aws-sdk/client-s3';
import { docClient, MEDIA_TABLE } from '../shared/db';
import { successResponse, errorResponse, ErrorCodes } from '../shared/response';
import { verifyGalleryToken } from '../shared/galleryAuth';

const MEDIA_BUCKET = process.env.MEDIA_BUCKET_NAME!;
const s3 = new S3Client({});

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const authResult = await verifyGalleryToken(event);
    if (!authResult.valid) {
      return errorResponse(
        ErrorCodes.UNAUTHORIZED.code,
        'Gallery access requires authentication',
        401
      );
    }

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

    const getResult = await docClient.send(
      new GetCommand({
        TableName: MEDIA_TABLE,
        Key: { year: yearNum, mediaId },
      })
    );

    if (!getResult.Item) {
      return errorResponse(
        ErrorCodes.NOT_FOUND.code,
        `Media ${mediaId} not found`,
        ErrorCodes.NOT_FOUND.status
      );
    }

    const item = getResult.Item as Record<string, unknown>;
    // Delete original, thumbnail, and display from S3 when present on the record
    const keys: string[] = [];
    if (item.originalKey) keys.push(item.originalKey as string);
    if (item.thumbnailKey) keys.push(item.thumbnailKey as string);
    if (item.displayKey) keys.push(item.displayKey as string);

    if (keys.length > 0) {
      await s3.send(
        new DeleteObjectsCommand({
          Bucket: MEDIA_BUCKET,
          Delete: {
            Objects: keys.map((Key) => ({ Key })),
            Quiet: true,
          },
        })
      );
    }

    await docClient.send(
      new DeleteCommand({
        TableName: MEDIA_TABLE,
        Key: { year: yearNum, mediaId },
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
