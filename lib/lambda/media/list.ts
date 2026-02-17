import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { docClient, MEDIA_TABLE } from '../shared/db';
import { successResponse, errorResponse, ErrorCodes } from '../shared/response';
import { verifyGalleryToken } from '../shared/galleryAuth';

const MEDIA_BUCKET = process.env.MEDIA_BUCKET_NAME!;
const s3 = new S3Client({});
const PRESIGNED_GET_EXPIRY = 60 * 60; // 1 hour

async function addPresignedUrls(
  items: Record<string, unknown>[],
  bucket: string
): Promise<Record<string, unknown>[]> {
  return Promise.all(
    items.map(async (item) => {
      const out = { ...item };
      const originalKey = item.originalKey as string | undefined;
      const thumbnailKey = item.thumbnailKey as string | undefined;
      const displayKey = item.displayKey as string | undefined;

      if (originalKey) {
        const cmd = new GetObjectCommand({ Bucket: bucket, Key: originalKey });
        (out as Record<string, unknown>).originalUrl = await getSignedUrl(s3, cmd, {
          expiresIn: PRESIGNED_GET_EXPIRY,
        });
      }
      if (thumbnailKey) {
        const cmd = new GetObjectCommand({ Bucket: bucket, Key: thumbnailKey });
        (out as Record<string, unknown>).thumbnailUrl = await getSignedUrl(s3, cmd, {
          expiresIn: PRESIGNED_GET_EXPIRY,
        });
      }
      if (displayKey) {
        const cmd = new GetObjectCommand({ Bucket: bucket, Key: displayKey });
        (out as Record<string, unknown>).displayUrl = await getSignedUrl(s3, cmd, {
          expiresIn: PRESIGNED_GET_EXPIRY,
        });
      }
      return out;
    })
  );
}

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

    const { year } = event.pathParameters || {};
    const q = event.queryStringParameters || {};

    if (!year) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR.code,
        'Year parameter is required',
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

    const eventId = q.eventId?.trim();
    const teamId = q.teamId?.trim();
    const person = q.person?.trim();
    const status = q.status?.trim();

    let items: Record<string, unknown>[];

    if (eventId) {
      const result = await docClient.send(
        new QueryCommand({
          TableName: MEDIA_TABLE,
          IndexName: 'EventIndex',
          KeyConditionExpression: 'eventId = :eventId',
          ExpressionAttributeValues: { ':eventId': eventId },
        })
      );
      items = (result.Items || []) as Record<string, unknown>[];
    } else if (teamId) {
      const result = await docClient.send(
        new QueryCommand({
          TableName: MEDIA_TABLE,
          IndexName: 'TeamIndex',
          KeyConditionExpression: 'teamId = :teamId',
          ExpressionAttributeValues: { ':teamId': teamId },
        })
      );
      items = (result.Items || []) as Record<string, unknown>[];
    } else {
      const result = await docClient.send(
        new QueryCommand({
          TableName: MEDIA_TABLE,
          KeyConditionExpression: '#year = :year',
          ExpressionAttributeNames: { '#year': 'year' },
          ExpressionAttributeValues: { ':year': yearNum },
        })
      );
      items = (result.Items || []) as Record<string, unknown>[];
    }

    if (person) {
      items = items.filter((i) => {
        const tags = i.tags as { persons?: string[] } | undefined;
        const persons = tags?.persons;
        return Array.isArray(persons) && persons.some((p) => String(p).toLowerCase().includes(person.toLowerCase()));
      });
    }

    if (status) {
      items = items.filter((i) => (i.status as string) === status);
    }

    items.sort((a, b) => (b.createdAt as string).localeCompare(a.createdAt as string));

    const withUrls = await addPresignedUrls(items, MEDIA_BUCKET);

    return successResponse({ media: withUrls });
  } catch (error) {
    console.error('Error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR.code,
      'Internal server error',
      ErrorCodes.INTERNAL_ERROR.status
    );
  }
}
