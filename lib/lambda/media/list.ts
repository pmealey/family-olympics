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
const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 100;

function decodeNextToken(token: string | undefined): Record<string, unknown> | undefined {
  if (!token?.trim()) return undefined;
  try {
    const json = Buffer.from(token.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    const key = JSON.parse(json) as Record<string, unknown>;
    return key && typeof key === 'object' ? key : undefined;
  } catch {
    return undefined;
  }
}

function encodeNextToken(lastKey: Record<string, unknown> | undefined): string | undefined {
  if (!lastKey || Object.keys(lastKey).length === 0) return undefined;
  return Buffer.from(JSON.stringify(lastKey))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

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
    const teamIdRaw = q.teamId?.trim();
    const teamIds = teamIdRaw
      ? teamIdRaw.split(',').map((id) => id.trim()).filter(Boolean)
      : [];
    const person = q.person?.trim();
    const limitRaw = q.limit != null ? parseInt(q.limit, 10) : DEFAULT_PAGE_SIZE;
    const limit = Number.isNaN(limitRaw)
      ? DEFAULT_PAGE_SIZE
      : Math.min(MAX_PAGE_SIZE, Math.max(1, limitRaw));
    const nextToken = decodeNextToken(q.nextToken);

    let items: Record<string, unknown>[];
    let lastEvaluatedKey: Record<string, unknown> | undefined;

    if (eventId) {
      const result = await docClient.send(
        new QueryCommand({
          TableName: MEDIA_TABLE,
          IndexName: 'EventIndex',
          KeyConditionExpression: 'eventId = :eventId',
          ExpressionAttributeValues: { ':eventId': eventId },
          Limit: limit,
          ScanIndexForward: false,
          ...(nextToken && { ExclusiveStartKey: nextToken }),
        })
      );
      items = (result.Items || []) as Record<string, unknown>[];
      lastEvaluatedKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    } else if (teamIds.length > 0) {
      // Support items with teamIds[] (multiple teams per photo) or legacy teamId
      const overFetch = limit * 10;
      const filterParts = teamIds.map((_, i) => `(contains(#teamIds, :t${i}) OR #teamId = :t${i})`);
      const filterExpr = filterParts.join(' OR ');
      const exprNames: Record<string, string> = { '#year': 'year', '#teamIds': 'teamIds', '#teamId': 'teamId' };
      const exprValues: Record<string, unknown> = { ':year': yearNum };
      teamIds.forEach((tid, i) => {
        exprValues[`:t${i}`] = tid;
      });
      const result = await docClient.send(
        new QueryCommand({
          TableName: MEDIA_TABLE,
          IndexName: 'YearCreatedAtIndex',
          KeyConditionExpression: '#year = :year',
          FilterExpression: filterExpr,
          ExpressionAttributeNames: exprNames,
          ExpressionAttributeValues: exprValues,
          Limit: overFetch,
          ScanIndexForward: false,
          ...(nextToken && { ExclusiveStartKey: nextToken }),
        })
      );
      const raw = (result.Items || []) as Record<string, unknown>[];
      items = raw.slice(0, limit);
      const lastItem = items[items.length - 1];
      lastEvaluatedKey =
        lastItem && raw.length > limit
          ? { year: yearNum, createdAt: lastItem.createdAt, mediaId: lastItem.mediaId }
          : (result.LastEvaluatedKey as Record<string, unknown> | undefined);
    } else {
      const result = await docClient.send(
        new QueryCommand({
          TableName: MEDIA_TABLE,
          IndexName: 'YearCreatedAtIndex',
          KeyConditionExpression: '#year = :year',
          ExpressionAttributeNames: { '#year': 'year' },
          ExpressionAttributeValues: { ':year': yearNum },
          Limit: limit,
          ScanIndexForward: false,
          ...(nextToken && { ExclusiveStartKey: nextToken }),
        })
      );
      items = (result.Items || []) as Record<string, unknown>[];
      lastEvaluatedKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    }

    items = items.filter((i) => i.thumbnailKey || i.displayKey);

    if (person) {
      items = items.filter((i) => {
        const tags = i.tags as { persons?: string[] } | undefined;
        const persons = tags?.persons;
        return Array.isArray(persons) && persons.some((p) => String(p).toLowerCase().includes(person.toLowerCase()));
      });
    }

    const withUrls = await addPresignedUrls(items, MEDIA_BUCKET);
    const responseNextToken = encodeNextToken(lastEvaluatedKey);

    return successResponse({
      media: withUrls,
      ...(responseNextToken && { nextToken: responseNextToken }),
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
