import { S3Handler, S3Event } from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { docClient, MEDIA_TABLE } from '../shared/db';

const MEDIA_BUCKET = process.env.MEDIA_BUCKET_NAME!;
const s3 = new S3Client({});

/**
 * Triggered by S3 when a file is uploaded to the originals/ prefix.
 * Creates the media record from object metadata (client sends metadata on the PUT).
 */

function parseKey(key: string): { year: number; mediaId: string; ext: string } | null {
  const decoded = decodeURIComponent(key.replace(/\+/g, ' '));
  const parts = decoded.split('/');
  if (parts.length < 3 || parts[1] !== 'originals') return null;
  const year = parseInt(parts[0], 10);
  if (Number.isNaN(year)) return null;
  const filename = parts[2];
  const lastDot = filename.lastIndexOf('.');
  const mediaId = lastDot === -1 ? filename : filename.slice(0, lastDot);
  const ext = lastDot === -1 ? '' : filename.slice(lastDot + 1).toLowerCase();
  return { year, mediaId, ext };
}

const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic']);

export const handler: S3Handler = async (event: S3Event) => {
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    const parsed = parseKey(key);
    if (!parsed) {
      console.warn('Skipping non-originals key:', key);
      continue;
    }

    const { year, mediaId, ext } = parsed;

    try {
      const head = await s3.send(
        new HeadObjectCommand({
          Bucket: bucket,
          Key: key,
        })
      );

      const meta = (head.Metadata || {}) as Record<string, string>;
      const type: 'image' | 'video' = IMAGE_EXT.has(ext) ? 'image' : 'video';
      const thumbExt = meta.thumbnailext?.trim() || 'webp';
      const displayExt = meta.displayext?.trim() || 'webp';

      const thumbnailKey = `${year}/thumbnails/${mediaId}.${thumbExt}`;
      const displayKey = type === 'image' ? `${year}/display/${mediaId}.${displayExt}` : undefined;

      let persons: string[] | undefined;
      if (meta.persons) {
        try {
          const parsed = JSON.parse(meta.persons) as unknown;
          persons = Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : undefined;
        } catch {
          // ignore
        }
      }

      const eventId = meta.eventid?.trim() || undefined;
      let teamIds: string[] | undefined;
      if (meta.teamids) {
        try {
          const parsed = JSON.parse(meta.teamids) as unknown;
          teamIds = Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : undefined;
        } catch {
          // ignore
        }
      }
      if (!teamIds?.length && meta.teamid?.trim()) {
        teamIds = [meta.teamid.trim()];
      }
      const teamId = teamIds?.length ? teamIds[0] : undefined; // primary for TeamIndex GSI
      const originalFileName = meta.originalfilename?.trim() || undefined;
      const now = new Date().toISOString();

      const item: Record<string, unknown> = {
        year,
        mediaId,
        type,
        originalKey: key,
        thumbnailKey,
        ...(displayKey && { displayKey }),
        mimeType: head.ContentType || (type === 'image' ? 'image/jpeg' : 'video/mp4'),
        fileSize: head.ContentLength ?? 0,
        uploadedBy: meta.uploadedby?.trim() || undefined,
        caption: meta.caption?.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      };
      if (originalFileName) item.originalFileName = originalFileName;

      if (eventId) item.eventId = eventId;
      if (teamId) item.teamId = teamId;
      if (teamIds?.length) item.teamIds = teamIds;
      if (persons?.length || eventId || teamId || teamIds?.length) {
        item.tags = {
          ...(eventId && { eventId }),
          ...(teamId && { teamId }),
          ...(teamIds?.length && { teamIds }),
          ...(persons?.length && { persons }),
        };
      }

      await docClient.send(
        new PutCommand({
          TableName: MEDIA_TABLE,
          Item: item,
        })
      );
    } catch (err) {
      console.error('Process failed for', key, err);
      try {
        const now = new Date().toISOString();
        const type: 'image' | 'video' = IMAGE_EXT.has(ext) ? 'image' : 'video';
        await docClient.send(
          new PutCommand({
            TableName: MEDIA_TABLE,
            Item: {
              year,
              mediaId,
              type,
              originalKey: key,
              updatedAt: now,
            },
          })
        );
      } catch (e) {
        console.error('Failed to write failed record', e);
      }
    }
  }
};
