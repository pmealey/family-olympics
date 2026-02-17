import { S3Handler, S3Event } from 'aws-lambda';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { docClient, MEDIA_TABLE } from '../shared/db';

const MEDIA_BUCKET = process.env.MEDIA_BUCKET_NAME!;
const s3 = new S3Client({});

const THUMBNAIL_WIDTH = 300;
const DISPLAY_WIDTH = 1600;

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
    const bucket = record.s3.bucket.name;
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

      const item = getItem.Item;
      if (!item) {
        console.warn('No media record for', year, mediaId);
        continue;
      }

      const type = item.type as string;
      const now = new Date().toISOString();

      if (type === 'video') {
        await docClient.send(
          new UpdateCommand({
            TableName: MEDIA_TABLE,
            Key: { year, mediaId },
            UpdateExpression: 'SET #status = :status, updatedAt = :now',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: { ':status': 'ready', ':now': now },
          })
        );
        continue;
      }

      // type === 'image': process with sharp
      await docClient.send(
        new UpdateCommand({
          TableName: MEDIA_TABLE,
          Key: { year, mediaId },
          UpdateExpression: 'SET #status = :status, updatedAt = :now',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: { ':status': 'processing', ':now': now },
        })
      );

      const getObj = await s3.send(
        new GetObjectCommand({ Bucket: bucket, Key: key })
      );
      const body = getObj.Body;
      if (!body) {
        throw new Error('Empty S3 object body');
      }
      const buffer = await streamToBuffer(body as NodeJS.ReadableStream);

      const sharp = (await import('sharp')).default;

      const thumbnailKey = `${year}/thumbnails/${mediaId}.webp`;
      const displayKey = `${year}/display/${mediaId}.webp`;

      const thumbnailBuffer = await sharp(buffer)
        .rotate()
        .resize(THUMBNAIL_WIDTH, null, { withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

      const displayBuffer = await sharp(buffer)
        .rotate()
        .resize(DISPLAY_WIDTH, null, { withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();

      await s3.send(
        new PutObjectCommand({
          Bucket: MEDIA_BUCKET,
          Key: thumbnailKey,
          Body: thumbnailBuffer,
          ContentType: 'image/webp',
        })
      );

      await s3.send(
        new PutObjectCommand({
          Bucket: MEDIA_BUCKET,
          Key: displayKey,
          Body: displayBuffer,
          ContentType: 'image/webp',
        })
      );

      await docClient.send(
        new UpdateCommand({
          TableName: MEDIA_TABLE,
          Key: { year, mediaId },
          UpdateExpression:
            'SET #status = :status, thumbnailKey = :thumb, displayKey = :disp, updatedAt = :now',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: {
            ':status': 'ready',
            ':thumb': thumbnailKey,
            ':disp': displayKey,
            ':now': now,
          },
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

function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}
