import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { docClient, MEDIA_TABLE } from '../shared/db';
import { successResponse, errorResponse, ErrorCodes } from '../shared/response';
import { verifyGalleryToken } from '../shared/galleryAuth';

const MEDIA_BUCKET = process.env.MEDIA_BUCKET_NAME!;
const PRESIGNED_URL_EXPIRY_SECONDS = 15 * 60; // 15 minutes
const MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB
const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024; // 100MB

function getExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1) return '';
  return fileName.slice(lastDot + 1).toLowerCase();
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

    const body = JSON.parse(event.body) as {
      fileName?: string;
      fileSize?: number;
      mimeType?: string;
      type?: 'image' | 'video';
      tags?: { eventId?: string; teamId?: string; persons?: string[] };
      uploadedBy?: string;
      caption?: string;
      thumbnailExt?: string;
      displayExt?: string;
    };

    const { fileName, fileSize, mimeType, type, tags, uploadedBy, caption, thumbnailExt, displayExt } = body;

    if (!fileName?.trim() || fileSize == null || !mimeType?.trim() || !type) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR.code,
        'fileName, fileSize, mimeType, and type are required',
        ErrorCodes.VALIDATION_ERROR.status
      );
    }

    if (type !== 'image' && type !== 'video') {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR.code,
        'type must be "image" or "video"',
        ErrorCodes.VALIDATION_ERROR.status
      );
    }

    const maxSize = type === 'image' ? MAX_IMAGE_SIZE_BYTES : MAX_VIDEO_SIZE_BYTES;
    if (fileSize > maxSize || fileSize < 0) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR.code,
        `fileSize must be between 0 and ${maxSize / (1024 * 1024)}MB for ${type}`,
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

    const mediaId = `media-${uuidv4()}`;
    const ext = getExtension(fileName.trim()) || (type === 'image' ? 'jpg' : 'mp4');
    const originalKey = `${yearNum}/originals/${mediaId}.${ext}`;

    const s3 = new S3Client({});

    // Generate presigned URL for original
    const originalUploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: MEDIA_BUCKET,
        Key: originalKey,
        ContentType: mimeType.trim(),
      }),
      { expiresIn: PRESIGNED_URL_EXPIRY_SECONDS }
    );

    // Generate presigned URLs for thumbnail (images + videos) and display (images only)
    let thumbnailUploadUrl: string | undefined;
    let displayUploadUrl: string | undefined;
    let thumbnailKey: string | undefined;
    let displayKey: string | undefined;

    const thumbExt = thumbnailExt || 'webp';
    const thumbMime = thumbExt === 'png' ? 'image/png' : thumbExt === 'webp' ? 'image/webp' : 'image/jpeg';
    thumbnailKey = `${yearNum}/thumbnails/${mediaId}.${thumbExt}`;

    thumbnailUploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: MEDIA_BUCKET,
        Key: thumbnailKey,
        ContentType: thumbMime,
      }),
      { expiresIn: PRESIGNED_URL_EXPIRY_SECONDS }
    );

    if (type === 'image') {
      const dispExt = displayExt || 'webp';
      const dispMime = dispExt === 'png' ? 'image/png' : dispExt === 'webp' ? 'image/webp' : 'image/jpeg';
      displayKey = `${yearNum}/display/${mediaId}.${dispExt}`;

      displayUploadUrl = await getSignedUrl(
        s3,
        new PutObjectCommand({
          Bucket: MEDIA_BUCKET,
          Key: displayKey,
          ContentType: dispMime,
        }),
        { expiresIn: PRESIGNED_URL_EXPIRY_SECONDS }
      );
    }

    const now = new Date().toISOString();
    const eventId = tags?.eventId?.trim() || undefined;
    const teamId = tags?.teamId?.trim() || undefined;
    const persons = Array.isArray(tags?.persons) ? tags!.persons!.map((p) => String(p).trim()).filter(Boolean) : undefined;

    const item: Record<string, unknown> = {
      year: yearNum,
      mediaId,
      type,
      status: 'pending',
      originalKey,
      ...(thumbnailKey && { thumbnailKey }),
      ...(displayKey && { displayKey }),
      mimeType: mimeType.trim(),
      fileSize,
      uploadedBy: uploadedBy?.trim() || undefined,
      caption: caption?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };

    if (eventId) item.eventId = eventId;
    if (teamId) item.teamId = teamId;
    if (persons?.length) item.tags = { ...(eventId && { eventId }), ...(teamId && { teamId }), persons };

    await docClient.send(
      new PutCommand({
        TableName: MEDIA_TABLE,
        Item: item,
      })
    );

    return successResponse(
      {
        uploadUrl: originalUploadUrl,
        ...(thumbnailUploadUrl && { thumbnailUploadUrl }),
        ...(displayUploadUrl && { displayUploadUrl }),
        mediaId,
        expiresIn: PRESIGNED_URL_EXPIRY_SECONDS,
      },
      201
    );
  } catch (error) {
    console.error('Error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR.code,
      'Internal server error',
      ErrorCodes.INTERNAL_ERROR.status
    );
  }
}
