import { S3Handler, S3Event } from 'aws-lambda';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, MEDIA_TABLE } from '../shared/db';

/**
 * Triggered by S3 when a file is uploaded to the originals/ prefix.
 * Marks the media record as "ready" — image resizing is done client-side.
 */

function parseKey(key: string): { year: number; mediaId: string } | null {
  const decoded = decodeURIComponent(key.replace(/\+/g, ' '));
  const parts = decoded.split('/');
  if (parts.length < 3 || parts[1] !== 'originals') return null;
  const year = parseInt(parts[0], 10);
  if (Number.isNaN(year)) return null;
  const filename = parts[2];
  const lastDot = filename.lastIndexOf('.');
  const mediaId = lastDot === -1 ? filename : filename.slice(0, lastDot);
  return { year, mediaId };
}

export const handler: S3Handler = async (event: S3Event) => {
  for (const record of event.Records) {
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    const parsed = parseKey(key);
    if (!parsed) {
      console.warn('Skipping non-originals key:', key);
      continue;
    }

    const { year, mediaId } = parsed;

    try {
      const getItem = await docClient.send(
        new GetCommand({
          TableName: MEDIA_TABLE,
          Key: { year, mediaId },
        })
      );

      if (!getItem.Item) {
        console.warn('No media record for', year, mediaId);
        continue;
      }

      const now = new Date().toISOString();
      await docClient.send(
        new UpdateCommand({
          TableName: MEDIA_TABLE,
          Key: { year, mediaId },
          UpdateExpression: 'SET #status = :status, updatedAt = :now',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: { ':status': 'ready', ':now': now },
        })
      );
    } catch (err) {
      console.error('Process failed for', key, err);
      try {
        await docClient.send(
          new UpdateCommand({
            TableName: MEDIA_TABLE,
            Key: { year, mediaId },
            UpdateExpression: 'SET #status = :status, updatedAt = :now',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: { ':status': 'failed', ':now': new Date().toISOString() },
          })
        );
      } catch (e) {
        console.error('Failed to set status to failed', e);
      }
    }
  }
};
