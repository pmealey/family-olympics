import React, { useState, useCallback, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Button,
  Card,
  CardBody,
  Select,
  Input,
  Loading,
  PageTransition,
  EmptyState,
  ErrorMessage,
  RefreshButton,
  MediaUpload,
} from '../components';
import { useCurrentOlympics, useListMedia, useEvents, useTeams } from '../hooks/useApi';
import type { MediaItem, Event, Team } from '../lib/api';

export const Gallery: React.FC = () => {
  const { data: olympics, loading: olympicsLoading, error: olympicsError, execute: refetchOlympics } =
    useCurrentOlympics();
  const [searchParams] = useSearchParams();
  const { data: eventsData } = useEvents(olympics?.year ?? null);
  const { data: teamsData } = useTeams(olympics?.year ?? null);
  const [eventFilter, setEventFilter] = useState<string>(() => searchParams.get('eventId') ?? '');
  const [teamFilter, setTeamFilter] = useState<string>(() => searchParams.get('teamId') ?? '');
  const [personFilter, setPersonFilter] = useState<string>(() => searchParams.get('person') ?? '');

  useEffect(() => {
    const eventId = searchParams.get('eventId') ?? '';
    const teamId = searchParams.get('teamId') ?? '';
    const person = searchParams.get('person') ?? '';
    setEventFilter(eventId);
    setTeamFilter(teamId);
    setPersonFilter(person);
  }, [searchParams]);

  const {
    data: mediaData,
    loading: mediaLoading,
    error: mediaError,
    execute: refetchMedia,
  } = useListMedia(olympics?.year ?? null, {
    ...(eventFilter && { eventId: eventFilter }),
    ...(teamFilter && { teamId: teamFilter }),
    ...(personFilter.trim() && { person: personFilter.trim() }),
  });

  const media = mediaData?.media ?? [];
  const events = eventsData?.events ?? [];
  const teams = teamsData?.teams ?? [];

  const [lightboxItem, setLightboxItem] = useState<MediaItem | null>(null);

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchOlympics(), refetchMedia()]);
  }, [refetchOlympics, refetchMedia]);

  const closeLightbox = useCallback(() => setLightboxItem(null), []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeLightbox]);

  const isLoading = olympicsLoading || mediaLoading;
  const error = olympicsError || mediaError;

  if (error) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <header className="space-y-1">
            <Link
              to="/"
              className="inline-block text-sm text-winter-gray hover:text-winter-accent transition-colors rounded focus:outline-none focus:ring-2 focus:ring-winter-accent/50"
              aria-label="Back to home"
            >
              ← Back to Home
            </Link>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-winter-dark m-0">Gallery</h1>
          </header>
          <ErrorMessage title="Failed to load gallery" message={error} onRetry={handleRefresh} />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <header className="space-y-1">
          <Link
            to="/"
            className="inline-block text-sm text-winter-gray hover:text-winter-accent transition-colors rounded focus:outline-none focus:ring-2 focus:ring-winter-accent/50"
            aria-label="Back to home"
          >
            ← Back to Home
          </Link>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-display font-bold text-winter-dark m-0">Gallery</h1>
            <RefreshButton onRefresh={handleRefresh} />
          </div>
        </header>

        {/* Filters */}
        <Card>
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                label="Event"
                options={[
                  { value: '', label: 'All events' },
                  ...events.map((e) => ({ value: e.eventId, label: e.name || e.eventId })),
                ]}
                value={eventFilter}
                onChange={(e) => setEventFilter(e.target.value)}
              />
              <Select
                label="Team"
                options={[
                  { value: '', label: 'All teams' },
                  ...teams.map((t) => ({ value: t.teamId, label: t.name })),
                ]}
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
              />
              <Input
                label="Person"
                placeholder="Filter by name"
                value={personFilter}
                onChange={(e) => setPersonFilter(e.target.value)}
              />
            </div>
          </CardBody>
        </Card>

        {isLoading ? (
          <div className="py-8">
            <Loading />
          </div>
        ) : media.length === 0 ? (
          <Card>
            <CardBody>
              <EmptyState
                icon="📷"
                title="No media yet"
                description="Upload photos or videos using the form below to get started."
              />
            </CardBody>
          </Card>
        ) : null}

        {/* Upload section - show when we have a year */}
        {olympics?.year && (
          <MediaUpload
            year={olympics.year}
            events={events}
            teams={teams}
            onUploadComplete={refetchMedia}
          />
        )}

        {media.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {media.map((item) => (
              <GalleryThumb
                key={item.mediaId}
                item={item}
                onClick={() => setLightboxItem(item)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxItem && (
        <Lightbox item={lightboxItem} onClose={closeLightbox} />
      )}
    </PageTransition>
  );
};

function GalleryThumb({
  item,
  onClick,
}: {
  item: MediaItem;
  onClick: () => void;
}) {
  const isImage = item.type === 'image';
  const isReady = item.status === 'ready';
  const thumbUrl = item.thumbnailUrl ?? item.displayUrl;

  return (
    <button
      type="button"
      onClick={onClick}
      className="aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-winter-accent focus:ring-offset-2"
    >
      {isImage && isReady && thumbUrl ? (
        <img
          src={thumbUrl}
          alt={item.caption || item.mediaId}
          className="w-full h-full object-cover"
        />
      ) : isReady && item.type === 'video' ? (
        <div className="w-full h-full flex items-center justify-center bg-gray-200 text-4xl">
          ▶️
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-winter-gray text-sm p-2">
          <span>{item.status === 'pending' || item.status === 'processing' ? '⏳' : '❌'}</span>
          <span className="capitalize">{item.status}</span>
        </div>
      )}
    </button>
  );
}

function Lightbox({ item, onClose }: { item: MediaItem; onClose: () => void }) {
  const isImage = item.type === 'image';
  const isReady = item.status === 'ready';
  const displayUrl = item.displayUrl ?? item.originalUrl;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Media viewer"
    >
      <div
        className="relative max-w-full max-h-full flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="sm"
          className="absolute -top-10 right-0 text-white hover:bg-white/20 z-10"
          onClick={onClose}
        >
          Close
        </Button>
        {isImage && isReady && displayUrl ? (
          <img
            src={displayUrl}
            alt={item.caption || item.mediaId}
            className="max-w-full max-h-[90vh] object-contain rounded"
          />
        ) : item.type === 'video' && isReady && item.originalUrl ? (
          <video
            src={item.originalUrl}
            controls
            autoPlay
            className="max-w-full max-h-[90vh] rounded"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="text-white text-center py-8">
            <p>Not ready yet ({item.status})</p>
            <Button variant="secondary" className="mt-4" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
        {(item.caption || item.uploadedBy) && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-sm p-3 rounded-b text-center">
            {item.caption && <p>{item.caption}</p>}
            {item.uploadedBy && <p className="text-winter-gray">— {item.uploadedBy}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
