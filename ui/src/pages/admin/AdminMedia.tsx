/**
 * Admin Media Management - view and delete media
 */

import React, { useState } from 'react';
import {
  Card,
  CardBody,
  Button,
  Loading,
  EmptyState,
  RefreshButton,
} from '../../components';
import { useAdmin } from '../../contexts/AdminContext';
import { useListMedia, useMutation } from '../../hooks/useApi';
import { apiClient } from '../../lib/api';
import type { MediaItem } from '../../lib/api';

export const AdminMedia: React.FC = () => {
  const { currentYear } = useAdmin();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const {
    data: mediaData,
    loading: mediaLoading,
    error: mediaError,
    execute: refetchMedia,
  } = useListMedia(currentYear ?? null, {
    ...(statusFilter && { status: statusFilter }),
  });

  const { mutate: deleteMedia, loading: deleteLoading } = useMutation(
    (year: number, mediaId: string) => apiClient.deleteMedia(year, mediaId)
  );

  const media = mediaData?.media ?? [];

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-display font-bold">Media</h2>
        <RefreshButton onRefresh={refetchMedia} />
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
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-winter-dark">Filter by status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="ready">Ready</option>
              <option value="failed">Failed</option>
            </select>
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
                  year={currentYear}
                  onDelete={async () => {
                    const result = await deleteMedia(currentYear, item.mediaId);
                    if (result) await refetchMedia();
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
  year,
  onDelete,
  deleteLoading,
}: {
  item: MediaItem;
  year: number;
  onDelete: () => Promise<void>;
  deleteLoading: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const isReady = item.status === 'ready';
  const thumbUrl = item.thumbnailUrl ?? item.displayUrl;

  const handleDelete = async () => {
    await onDelete();
    setConfirming(false);
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
      <div className="aspect-square bg-gray-100 relative">
        {isReady && thumbUrl && item.type === 'image' ? (
          <img
            src={thumbUrl}
            alt={item.caption || item.mediaId}
            className="w-full h-full object-cover"
          />
        ) : item.type === 'video' ? (
          <div className="w-full h-full flex items-center justify-center text-4xl">▶️</div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-winter-gray text-sm p-2">
            <span>{item.status === 'pending' || item.status === 'processing' ? '⏳' : '❌'}</span>
            <span className="capitalize text-xs">{item.status}</span>
          </div>
        )}
        <span
          className={`absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-medium ${
            item.status === 'ready'
              ? 'bg-green-100 text-green-800'
              : item.status === 'failed'
              ? 'bg-red-100 text-red-800'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          {item.status}
        </span>
      </div>
      <div className="p-3">
        <p className="text-xs text-winter-gray truncate" title={item.mediaId}>
          {item.mediaId}
        </p>
        {item.caption && (
          <p className="text-sm mt-1 line-clamp-2">{item.caption}</p>
        )}
        {item.uploadedBy && (
          <p className="text-xs text-winter-gray mt-0.5">by {item.uploadedBy}</p>
        )}
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
