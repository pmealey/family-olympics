import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Client } from '@aws-sdk/client-s3';
import { docClient, MEDIA_TABLE } from '../shared/db';
import { successResponse, errorResponse, ErrorCodes } from '../shared/response';
import { verifyGalleryToken } from '../shared/galleryAuth';

const MEDIA_BUCKET = process.env.MEDIA_BUCKET_NAME!;
const s3 = new S3Client({});
const PRESIGNED_GET_EXPIRY = 60 * 60; // 1 hour

interface UpdateBody {
  caption?: string;
  uploadedBy?: string;
  eventId?: string;
  teamId?: string;
  teamIds?: string[];
  persons?: string[];
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

    let body: UpdateBody = {};
    if (event.body?.trim()) {
      try {
        body = JSON.parse(event.body) as UpdateBody;
      } catch {
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR.code,
          'Invalid JSON body',
          ErrorCodes.VALIDATION_ERROR.status
        );
      }
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

    const existing = getResult.Item as Record<string, unknown>;
    const existingTags = (existing.tags as { eventId?: string; teamId?: string; teamIds?: string[]; persons?: string[] }) || {};
    const updatedAt = new Date().toISOString();

    const caption = body.caption !== undefined ? String(body.caption).trim() : undefined;
    const uploadedBy = body.uploadedBy !== undefined ? String(body.uploadedBy).trim() : undefined;
    const eventIdVal = body.eventId !== undefined ? String(body.eventId).trim() : undefined;
    const teamIdsArr = body.teamIds !== undefined
      ? (Array.isArray(body.teamIds) ? body.teamIds.map(String).filter(Boolean) : [])
      : undefined;
    const teamIdVal =
      teamIdsArr !== undefined
        ? (teamIdsArr.length > 0 ? teamIdsArr[0] : '')
        : body.teamId !== undefined
          ? String(body.teamId).trim()
          : undefined;
    const persons = body.persons !== undefined
      ? (Array.isArray(body.persons) ? body.persons.map(String).filter(Boolean) : [])
      : undefined;

    const setParts: string[] = [];
    const removeParts: string[] = [];
    const exprNames: Record<string, string> = {};
    const exprValues: Record<string, unknown> = {};

    if (caption !== undefined) {
      exprNames['#caption'] = 'caption';
      if (caption === '') {
        removeParts.push('#caption');
      } else {
        exprValues[':caption'] = caption;
        setParts.push('#caption = :caption');
      }
    }
    if (uploadedBy !== undefined) {
      exprNames['#uploadedBy'] = 'uploadedBy';
      if (uploadedBy === '') {
        removeParts.push('#uploadedBy');
      } else {
        exprValues[':uploadedBy'] = uploadedBy;
        setParts.push('#uploadedBy = :uploadedBy');
      }
    }
    if (eventIdVal !== undefined) {
      exprNames['#eventId'] = 'eventId';
      if (eventIdVal === '') {
        removeParts.push('#eventId');
      } else {
        exprValues[':eventId'] = eventIdVal;
        setParts.push('#eventId = :eventId');
      }
    }
    if (teamIdVal !== undefined) {
      exprNames['#teamId'] = 'teamId';
      if (teamIdVal === '') {
        removeParts.push('#teamId');
      } else {
        exprValues[':teamId'] = teamIdVal;
        setParts.push('#teamId = :teamId');
      }
    }
    if (teamIdsArr !== undefined) {
      exprNames['#teamIds'] = 'teamIds';
      if (teamIdsArr.length === 0) {
        removeParts.push('#teamIds');
      } else {
        exprValues[':teamIds'] = teamIdsArr;
        setParts.push('#teamIds = :teamIds');
      }
    }

    const newTags = { ...existingTags };
    if (persons !== undefined) {
      newTags.persons = persons.length ? persons : undefined;
    }
    if (eventIdVal !== undefined) {
      newTags.eventId = eventIdVal === '' ? undefined : eventIdVal;
    }
    if (teamIdVal !== undefined) {
      newTags.teamId = teamIdVal === '' ? undefined : teamIdVal;
    }
    if (teamIdsArr !== undefined) {
      newTags.teamIds = teamIdsArr.length ? teamIdsArr : undefined;
    }
    exprNames['#tags'] = 'tags';
    if (Object.keys(newTags).length === 0) {
      removeParts.push('#tags');
    } else {
      exprValues[':tags'] = newTags;
      setParts.push('#tags = :tags');
    }

    exprNames['#updatedAt'] = 'updatedAt';
    exprValues[':updatedAt'] = updatedAt;
    setParts.push('#updatedAt = :updatedAt');

    const setExpr = setParts.length ? `SET ${setParts.join(', ')}` : '';
    const removeExpr = removeParts.length ? ` REMOVE ${removeParts.join(', ')}` : '';
    const updateExpression = setExpr + removeExpr;
    if (!updateExpression.trim()) {
      return successResponse(existing);
    }

    await docClient.send(
      new UpdateCommand({
        TableName: MEDIA_TABLE,
        Key: { year: yearNum, mediaId },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: exprNames,
        ...(Object.keys(exprValues).length && { ExpressionAttributeValues: exprValues }),
      })
    );

    const updatedItem: Record<string, unknown> = {
      ...existing,
      updatedAt,
    };
    if (caption !== undefined) updatedItem.caption = caption || undefined;
    if (uploadedBy !== undefined) updatedItem.uploadedBy = uploadedBy || undefined;
    if (eventIdVal !== undefined) updatedItem.eventId = eventIdVal || undefined;
    if (teamIdVal !== undefined) updatedItem.teamId = teamIdVal || undefined;
    if (teamIdsArr !== undefined) updatedItem.teamIds = teamIdsArr.length ? teamIdsArr : undefined;
    updatedItem.tags = Object.keys(newTags).length ? newTags : undefined;

    const originalKey = updatedItem.originalKey as string | undefined;
    const thumbnailKey = updatedItem.thumbnailKey as string | undefined;
    const displayKey = updatedItem.displayKey as string | undefined;
    if (originalKey) {
      const cmd = new GetObjectCommand({ Bucket: MEDIA_BUCKET, Key: originalKey });
      (updatedItem as Record<string, unknown>).originalUrl = await getSignedUrl(s3, cmd, { expiresIn: PRESIGNED_GET_EXPIRY });
    }
    if (thumbnailKey) {
      const cmd = new GetObjectCommand({ Bucket: MEDIA_BUCKET, Key: thumbnailKey });
      (updatedItem as Record<string, unknown>).thumbnailUrl = await getSignedUrl(s3, cmd, { expiresIn: PRESIGNED_GET_EXPIRY });
    }
    if (displayKey) {
      const cmd = new GetObjectCommand({ Bucket: MEDIA_BUCKET, Key: displayKey });
      (updatedItem as Record<string, unknown>).displayUrl = await getSignedUrl(s3, cmd, { expiresIn: PRESIGNED_GET_EXPIRY });
    }

    return successResponse(updatedItem);
  } catch (error) {
    console.error('Error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR.code,
      'Internal server error',
      ErrorCodes.INTERNAL_ERROR.status
    );
  }
}
