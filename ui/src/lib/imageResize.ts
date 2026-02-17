/**
 * Client-side image resizing using the browser Canvas API.
 * No native dependencies — works everywhere.
 */

const THUMBNAIL_MAX_WIDTH = 300;
const DISPLAY_MAX_WIDTH = 1600;
const THUMBNAIL_QUALITY = 0.8;
const DISPLAY_QUALITY = 0.85;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

function resizeToBlob(
  img: HTMLImageElement,
  maxWidth: number,
  quality: number,
  mimeType: string
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    let { width, height } = img;
    if (width > maxWidth) {
      height = Math.round((height * maxWidth) / width);
      width = maxWidth;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas not supported'));
      return;
    }
    ctx.drawImage(img, 0, 0, width, height);

    // Prefer WebP, fall back to JPEG
    const outputType = mimeType === 'image/png' ? 'image/png' : 'image/webp';
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          // WebP not supported, fall back to JPEG
          canvas.toBlob(
            (jpegBlob) => {
              if (jpegBlob) resolve(jpegBlob);
              else reject(new Error('Failed to create image blob'));
            },
            'image/jpeg',
            quality
          );
        }
      },
      outputType,
      quality
    );
  });
}

export interface ResizedImages {
  thumbnail: Blob;
  display: Blob;
  thumbnailType: string;
  displayType: string;
}

/**
 * Resize an image file into thumbnail and display versions.
 * Returns Blobs ready for upload.
 */
export async function resizeImage(file: File): Promise<ResizedImages> {
  const img = await loadImage(file);

  const thumbnail = await resizeToBlob(img, THUMBNAIL_MAX_WIDTH, THUMBNAIL_QUALITY, file.type);
  const display = await resizeToBlob(img, DISPLAY_MAX_WIDTH, DISPLAY_QUALITY, file.type);

  return {
    thumbnail,
    display,
    thumbnailType: thumbnail.type,
    displayType: display.type,
  };
}

export interface VideoThumbnail {
  thumbnail: Blob;
  thumbnailType: string;
}

/**
 * Capture a thumbnail from a video file by seeking to 1 second (or 0 if short).
 * Uses a hidden <video> element + Canvas. Returns a JPEG/WebP blob.
 */
export async function captureVideoThumbnail(file: File): Promise<VideoThumbnail> {
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.muted = true;
  video.playsInline = true;

  const url = URL.createObjectURL(file);

  try {
    // Wait for metadata to load so we know the duration and dimensions
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Failed to load video'));
      video.src = url;
    });

    // Seek to 1s or 25% of duration, whichever is smaller
    const seekTime = Math.min(1, video.duration * 0.25);
    video.currentTime = seekTime;

    // Wait for the frame to be available
    await new Promise<void>((resolve, reject) => {
      video.onseeked = () => resolve();
      video.onerror = () => reject(new Error('Failed to seek video'));
    });

    // Draw the frame to canvas and resize to thumbnail width
    let { videoWidth: width, videoHeight: height } = video;
    if (width > THUMBNAIL_MAX_WIDTH) {
      height = Math.round((height * THUMBNAIL_MAX_WIDTH) / width);
      width = THUMBNAIL_MAX_WIDTH;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');
    ctx.drawImage(video, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else {
            // WebP not supported, fall back to JPEG
            canvas.toBlob(
              (jpegBlob) => {
                if (jpegBlob) resolve(jpegBlob);
                else reject(new Error('Failed to create thumbnail blob'));
              },
              'image/jpeg',
              THUMBNAIL_QUALITY
            );
          }
        },
        'image/webp',
        THUMBNAIL_QUALITY
      );
    });

    return { thumbnail: blob, thumbnailType: blob.type };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Get the file extension for a blob type.
 */
export function extForType(mimeType: string): string {
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/png') return 'png';
  return 'jpg';
}
