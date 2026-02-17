import React, { useState, useRef, useCallback } from 'react';
import { Button, Card, CardBody, Input, Select } from './index';
import { apiClient } from '../lib/api';
import { resizeImage, captureVideoThumbnail, extForType } from '../lib/imageResize';
import type { Event, Team } from '../lib/api';

const MAX_IMAGE_BYTES = 20 * 1024 * 1024; // 20MB
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100MB

const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic'];
const VIDEO_MIMES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];

function getFileType(mime: string): 'image' | 'video' {
  if (IMAGE_MIMES.includes(mime)) return 'image';
  if (VIDEO_MIMES.some(() => mime.startsWith('video/'))) return 'video';
  if (mime.startsWith('image/')) return 'image';
  return 'video';
}

function getMaxSize(type: 'image' | 'video'): number {
  return type === 'image' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
}

export interface MediaUploadProps {
  year: number;
  events: Event[];
  teams: Team[];
  initialEventId?: string;
  initialTeamId?: string;
  onUploadComplete?: () => void;
  className?: string;
}

interface FileProgress {
  file: File;
  status: 'pending' | 'resizing' | 'uploading' | 'done' | 'error';
  progress: number;
  error?: string;
  mediaId?: string;
}

function uploadBlob(url: string, blob: Blob, contentType: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed: ${xhr.status}`));
    });
    xhr.addEventListener('error', () => reject(new Error('Network error')));
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.send(blob);
  });
}

export const MediaUpload: React.FC<MediaUploadProps> = ({
  year,
  events,
  teams,
  initialEventId = '',
  initialTeamId = '',
  onUploadComplete,
  className = '',
}) => {
  const [eventId, setEventId] = useState(initialEventId);
  const [teamId, setTeamId] = useState(initialTeamId);
  const [persons, setPersons] = useState<string[]>([]);
  const [uploadedBy, setUploadedBy] = useState('');
  const [caption, setCaption] = useState('');
  const [files, setFiles] = useState<FileProgress[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedTeam = teams.find((t) => t.teamId === teamId);
  const memberOptions = selectedTeam?.members ?? [];

  const addFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles?.length) return;
    const list: FileProgress[] = [];
    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      const type = getFileType(file.type);
      const max = getMaxSize(type);
      const error =
        file.size > max
          ? `Max size for ${type} is ${max / (1024 * 1024)}MB`
          : undefined;
      list.push({
        file,
        status: error ? 'error' : 'pending',
        progress: 0,
        error,
      });
    }
    setFiles((prev) => [...prev, ...list]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateFile = (index: number, update: Partial<FileProgress>) => {
    setFiles((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...update };
      return next;
    });
  };

  const uploadOne = useCallback(
    async (fp: FileProgress, index: number): Promise<void> => {
      const type = getFileType(fp.file.type);
      const isImage = type === 'image';

      try {
        // Step 1: generate thumbnail (+ display for images) client-side
        let thumbnailBlob: Blob | undefined;
        let displayBlob: Blob | undefined;
        let thumbnailExt: string | undefined;
        let displayExt: string | undefined;

        updateFile(index, { status: 'resizing', progress: 0 });
        try {
          if (isImage) {
            const resized = await resizeImage(fp.file);
            thumbnailBlob = resized.thumbnail;
            displayBlob = resized.display;
            thumbnailExt = extForType(resized.thumbnailType);
            displayExt = extForType(resized.displayType);
          } else {
            const videoThumb = await captureVideoThumbnail(fp.file);
            thumbnailBlob = videoThumb.thumbnail;
            thumbnailExt = extForType(videoThumb.thumbnailType);
          }
        } catch (err) {
          console.warn('Client-side thumbnail generation failed, uploading original only:', err);
        }

        // Step 2: get presigned URLs
        updateFile(index, { status: 'uploading', progress: 5 });

        const res = await apiClient.requestMediaUploadUrl(year, {
          fileName: fp.file.name,
          fileSize: fp.file.size,
          mimeType: fp.file.type,
          type,
          tags: {
            ...(eventId && { eventId }),
            ...(teamId && { teamId }),
            ...(persons.length > 0 && { persons }),
          },
          ...(uploadedBy.trim() && { uploadedBy: uploadedBy.trim() }),
          ...(caption.trim() && { caption: caption.trim() }),
          ...(thumbnailExt && { thumbnailExt }),
          ...(displayExt && { displayExt }),
        });

        if (!res.success || !res.data?.uploadUrl) {
          updateFile(index, {
            status: 'error',
            error: res.error?.message ?? 'Failed to get upload URL',
          });
          return;
        }

        const { uploadUrl, thumbnailUploadUrl, displayUploadUrl, mediaId } = res.data;

        // Step 3: upload thumbnail and display first so they exist when the process Lambda runs (on original)
        if (thumbnailBlob && thumbnailUploadUrl) {
          await uploadBlob(thumbnailUploadUrl, thumbnailBlob, thumbnailBlob.type);
        }
        updateFile(index, { progress: 40 });
        if (displayBlob && displayUploadUrl) {
          await uploadBlob(displayUploadUrl, displayBlob, displayBlob.type);
        }
        updateFile(index, { progress: 50 });

        // Step 4: upload original with metadata (process Lambda creates the DB record from this)
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const pct = 50 + Math.round((e.loaded / e.total) * 50); // 50-100%
              updateFile(index, { progress: pct });
            }
          });
          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`Upload failed: ${xhr.status}`));
          });
          xhr.addEventListener('error', () => reject(new Error('Network error')));
          xhr.open('PUT', uploadUrl);
          xhr.setRequestHeader('Content-Type', fp.file.type);
          // Metadata for process Lambda (S3 stores as x-amz-meta-*, returned lowercase)
          if (caption.trim()) xhr.setRequestHeader('x-amz-meta-caption', caption.trim());
          if (uploadedBy.trim()) xhr.setRequestHeader('x-amz-meta-uploadedby', uploadedBy.trim());
          if (eventId) xhr.setRequestHeader('x-amz-meta-eventid', eventId);
          if (teamId) xhr.setRequestHeader('x-amz-meta-teamid', teamId);
          if (persons.length > 0) xhr.setRequestHeader('x-amz-meta-persons', JSON.stringify(persons));
          if (thumbnailExt) xhr.setRequestHeader('x-amz-meta-thumbnailext', thumbnailExt);
          if (displayExt) xhr.setRequestHeader('x-amz-meta-displayext', displayExt);
          xhr.send(fp.file);
        });

        updateFile(index, { status: 'done', progress: 100, mediaId });
      } catch (err) {
        updateFile(index, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Upload failed',
        });
      }
    },
    [year, eventId, teamId, persons, uploadedBy, caption]
  );

  const startUploads = useCallback(async () => {
    setTagError(null);
    const pending = files
      .map((fp, i) => ({ fp, i }))
      .filter(({ fp }) => fp.status === 'pending');
    if (pending.length === 0) return;
    for (const { fp, i } of pending) {
      await uploadOne(fp, i);
    }
    const allDone = files.every((f) => f.status === 'done' || f.status === 'error');
    if (allDone) onUploadComplete?.();
  }, [files, uploadOne, onUploadComplete]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const hasPending = pendingCount > 0;
  const isUploading = files.some((f) => f.status === 'uploading' || f.status === 'resizing');

  return (
    <Card className={className}>
      <CardBody>
        <h3 className="text-lg font-display font-semibold mb-4">Upload photos or videos</h3>

        {/* Tag selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <Select
            label="Event (optional)"
            options={[
              { value: '', label: '— None —' },
              ...events.map((e) => ({ value: e.eventId, label: e.name || e.eventId })),
            ]}
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
          />
          <Select
            label="Team (optional)"
            options={[
              { value: '', label: '— None —' },
              ...teams.map((t) => ({ value: t.teamId, label: t.name })),
            ]}
            value={teamId}
            onChange={(e) => {
              setTeamId(e.target.value);
              setPersons([]);
            }}
          />
        </div>

        {memberOptions.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-winter-dark mb-1">
              Tag people (optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {memberOptions.map((member) => {
                const checked = persons.includes(member);
                return (
                  <label
                    key={member}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-300 bg-white cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setPersons((prev) =>
                          checked ? prev.filter((p) => p !== member) : [...prev, member]
                        )
                      }
                      className="rounded border-gray-300 text-winter-accent focus:ring-winter-accent"
                    />
                    <span className="text-sm">{member}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <Input
            label="Your name (optional)"
            value={uploadedBy}
            onChange={(e) => setUploadedBy(e.target.value)}
            placeholder="Who uploaded this"
          />
          <Input
            label="Caption (optional)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Short caption"
          />
        </div>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${dragActive ? 'border-winter-accent bg-winter-accent-light/10' : 'border-gray-300 hover:border-winter-accent/50'}
          `}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <p className="text-winter-gray mb-1">Drop files here or click to browse</p>
          <p className="text-sm text-winter-gray">Images up to 20MB, videos up to 100MB</p>
        </div>

        {tagError && <p className="mt-2 text-sm text-red-600">{tagError}</p>}

        {/* File list with progress */}
        {files.length > 0 && (
          <ul className="mt-4 space-y-2">
            {files.map((fp, i) => (
              <li
                key={`${fp.file.name}-${i}`}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <span className="flex-1 truncate text-sm font-medium" title={fp.file.name}>
                  {fp.file.name}
                </span>
                {fp.status === 'pending' && (
                  <Button variant="ghost" size="sm" onClick={() => removeFile(i)}>
                    Remove
                  </Button>
                )}
                {fp.status === 'resizing' && (
                  <span className="text-sm text-winter-gray">Resizing...</span>
                )}
                {fp.status === 'uploading' && (
                  <div className="flex-1 max-w-[120px] h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-winter-accent rounded-full transition-all"
                      style={{ width: `${fp.progress}%` }}
                    />
                  </div>
                )}
                {fp.status === 'done' && (
                  <span className="text-sm text-green-600">Uploaded</span>
                )}
                {fp.status === 'error' && (
                  <span className="text-sm text-red-600">{fp.error}</span>
                )}
              </li>
            ))}
          </ul>
        )}

        {hasPending && (
          <Button
            className="mt-4"
            onClick={startUploads}
            loading={isUploading}
          >
            Upload {pendingCount} file{pendingCount !== 1 ? 's' : ''}
          </Button>
        )}
      </CardBody>
    </Card>
  );
};
