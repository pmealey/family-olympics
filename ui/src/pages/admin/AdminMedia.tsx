/**
 * Admin Media Management - view and delete media
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardBody,
  Button,
  Loading,
  EmptyState,
  RefreshButton,
  GalleryPasswordPrompt,
} from '../../components';
import { useAdmin } from '../../contexts/AdminContext';
import { useMutation } from '../../hooks/useApi';
import { useGalleryAuth } from '../../hooks/useGalleryAuth';
import { apiClient } from '../../lib/api';
import type { MediaItem } from '../../lib/api';

export const AdminMedia: React.FC = () => {
  const { currentYear, currentOlympics } = useAdmin();
  const galleryAuth = useGalleryAuth(currentYear);
  const { token, authError, authenticate, isAuthenticated, logout } = galleryAuth;

  // Sync gallery token to API client during render
  apiClient.setGalleryToken(token);

  const needsPassword = currentOlympics?.hasGalleryPassword === true && !isAuthenticated;

  const [media, setMedia] = useState<MediaItem[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const fetchMedia = useCallback(async () => {
    if (!currentYear) return;
    setMediaLoading(true);
    setMediaError(null);
    try {
      const res = await apiClient.listMedia(currentYear, { limit: 500 });
      if (res.success && res.data) {
        setMedia(res.data.media);
      } else {
        if (res.error?.code === 'UNAUTHORIZED') {
          logout();
        }
        setMediaError(res.error?.message ?? 'Failed to load media');
      }
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : 'Failed to load media');
    } finally {
      setMediaLoading(false);
    }
  }, [currentYear, logout]);

  // Fetch media when we have a year + are authenticated (or gallery is open)
  useEffect(() => {
    if (currentYear && !needsPassword) {
      fetchMedia();
    }
  }, [currentYear, needsPassword, fetchMedia]);

  const { mutate: deleteMedia, loading: deleteLoading } = useMutation(
    (year: number, mediaId: string) => apiClient.deleteMedia(year, mediaId)
  );

  if (!currentYear) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-display font-bold">Media</h2>
        <Card>
          <CardBody>
            <EmptyState
              icon="📷"
              title="No year selected"
              description="Select an Olympics year from the Olympics tab first."
            />
          </CardBody>
        </Card>
      </div>
    );
  }

  if (needsPassword) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-display font-bold">Media</h2>
        <Card>
          <CardBody>
            <p className="text-winter-dark mb-3">
              The gallery for {currentYear} is password-protected. Enter the gallery password to view and manage media.
            </p>
            <GalleryPasswordPrompt
              onSubmit={async (password) => {
                const ok = await authenticate(
                  password,
                  (y, p) => apiClient.validateGalleryPassword(y, p)
                );
                return ok;
              }}
              error={authError}
            />
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-display font-bold">Media</h2>
        <RefreshButton onRefresh={fetchMedia} />
      </div>

      {mediaError && (
        <Card>
          <CardBody>
            <p className="text-red-600">{mediaError}</p>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody>
          <div className="mb-4">
            <span className="text-sm text-winter-gray">
              {media.length} item{media.length !== 1 ? 's' : ''}
            </span>
          </div>

          {mediaLoading ? (
            <div className="py-8">
              <Loading />
            </div>
          ) : media.length === 0 ? (
            <EmptyState
              icon="📷"
              title="No media"
              description="No media items found for this year."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {media.map((item) => (
                <AdminMediaCard
                  key={item.mediaId}
                  item={item}
                  onDelete={async () => {
                    const result = await deleteMedia(currentYear, item.mediaId);
                    if (result) await fetchMedia();
                  }}
                  deleteLoading={deleteLoading}
                />
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

function AdminMediaCard({
  item,
  onDelete,
  deleteLoading,
}: {
  item: MediaItem;
  onDelete: () => Promise<void>;
  deleteLoading: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const thumbUrl = item.thumbnailUrl ?? item.displayUrl;

  const handleDelete = async () => {
    await onDelete();
    setConfirming(false);
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
      <div className="aspect-square bg-gray-100 relative">
        {thumbUrl ? (
          <div className="relative w-full h-full">
            <img
              src={thumbUrl}
              alt={item.caption || item.mediaId}
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
            />
            {item.type === 'video' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                  <span className="text-white text-lg ml-0.5">▶</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-winter-gray text-sm p-2">
            <span className="text-2xl mb-1">📷</span>
            <span className="text-xs">No preview</span>
          </div>
        )}
        {item.type === 'video' && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
            Video
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs text-winter-gray truncate" title={item.mediaId}>
          {item.mediaId}
        </p>
        {item.caption && (
          <p className="text-sm mt-1 line-clamp-2">{item.caption}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          {item.uploadedBy && (
            <p className="text-xs text-winter-gray">by {item.uploadedBy}</p>
          )}
          {item.createdAt && (
            <p className="text-xs text-winter-gray">
              {new Date(item.createdAt).toLocaleDateString()}
            </p>
          )}
        </div>
        {!confirming ? (
          <Button
            variant="danger"
            size="sm"
            className="mt-2 w-full"
            onClick={() => setConfirming(true)}
            disabled={deleteLoading}
          >
            Delete
          </Button>
        ) : (
          <div className="mt-2 flex gap-2">
            <Button variant="danger" size="sm" className="flex-1" onClick={handleDelete} loading={deleteLoading}>
              Confirm
            </Button>
            <Button variant="secondary" size="sm" className="flex-1" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
