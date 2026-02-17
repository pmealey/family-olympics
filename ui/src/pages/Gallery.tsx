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
  GalleryPasswordPrompt,
} from '../components';
import { useCurrentOlympics, useListMedia, useEvents, useTeams } from '../hooks/useApi';
import { useGalleryAuth } from '../hooks/useGalleryAuth';
import { apiClient } from '../lib/api';
import type { MediaItem } from '../lib/api';

export const Gallery: React.FC = () => {
  const { data: olympics, loading: olympicsLoading, error: olympicsError, execute: refetchOlympics } =
    useCurrentOlympics();
  const year = olympics?.year ?? null;
  const galleryAuth = useGalleryAuth(year);
  const { isAuthenticated, token, authError, authenticate, logout } = galleryAuth;

  useEffect(() => {
    apiClient.setGalleryToken(token);
  }, [token]);

  const [searchParams] = useSearchParams();
  const { data: eventsData } = useEvents(year);
  const { data: teamsData } = useTeams(year);
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
  } = useListMedia(
    year != null && isAuthenticated ? year : null,
    {
      ...(eventFilter && { eventId: eventFilter }),
      ...(teamFilter && { teamId: teamFilter }),
      ...(personFilter.trim() && { person: personFilter.trim() }),
    }
  );

  const media = mediaData?.media ?? [];
  const events = eventsData?.events ?? [];
  const teams = teamsData?.teams ?? [];

  const [lightboxItem, setLightboxItem] = useState<MediaItem | null>(null);
  const [showUploadCard, setShowUploadCard] = useState(false);

  // Refetch media when returning from upload view so new uploads appear
  const prevShowUploadRef = React.useRef(showUploadCard);
  useEffect(() => {
    if (prevShowUploadRef.current === true && showUploadCard === false) {
      refetchMedia();
    }
    prevShowUploadRef.current = showUploadCard;
  }, [showUploadCard, refetchMedia]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchOlympics(), refetchMedia()]);
  }, [refetchOlympics, refetchMedia]);

  const closeLightbox = useCallback(() => setLightboxItem(null), []);

  useEffect(() => {
    if (mediaError && isAuthenticated) {
      logout();
    }
  }, [mediaError, isAuthenticated, logout]);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeLightbox]);

  const isLoading = olympicsLoading || mediaLoading;
  const error = olympicsError || mediaError;

  if (year != null && !isAuthenticated) {
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
          <GalleryPasswordPrompt
            onSubmit={(password) =>
              authenticate(password, (y, p) => apiClient.validateGalleryPassword(y, p))
            }
            error={authError}
          />
        </div>
      </PageTransition>
    );
  }

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

  if (showUploadCard && olympics?.year) {
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
              <h1 className="text-xl sm:text-2xl font-display font-bold text-winter-dark m-0">Upload photos & videos</h1>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowUploadCard(false)}
              >
                Back to gallery
              </Button>
            </div>
          </header>

          <MediaUpload
            year={olympics.year}
            events={events}
            teams={teams}
            onUploadComplete={() => {
              refetchMedia();
            }}
          />
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
            <div className="flex items-center gap-2">
              {olympics?.year && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowUploadCard(true)}
                >
                  Upload more
                </Button>
              )}
              <RefreshButton onRefresh={handleRefresh} />
            </div>
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
                title="No photos or videos yet"
                description="Add photos or videos to get started."
              />
              {olympics?.year && (
                <div className="mt-4">
                  <Button onClick={() => setShowUploadCard(true)}>
                    Add photos & videos
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {media.map((item) => (
                <GalleryThumb
                  key={item.mediaId}
                  item={item}
                  onClick={() => setLightboxItem(item)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Lightbox */}
      {lightboxItem && (
        <Lightbox
          item={lightboxItem}
          media={media}
          onClose={closeLightbox}
          onNavigate={(dir) => {
            const idx = media.findIndex((m) => m.mediaId === lightboxItem.mediaId);
            if (idx === -1) return;
            const nextIdx = dir === 'next' ? idx + 1 : idx - 1;
            const next = media[nextIdx];
            if (next) setLightboxItem(next);
          }}
        />
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

function Lightbox({
  item,
  media,
  onClose,
  onNavigate,
}: {
  item: MediaItem;
  media: MediaItem[];
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
}) {
  const currentIndex = media.findIndex((m) => m.mediaId === item.mediaId);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < media.length - 1;

  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (hasPrev) onNavigate('prev');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (hasNext) onNavigate('next');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hasPrev, hasNext, onNavigate]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const minSwipe = 50;
    if (dx < -minSwipe && hasNext) onNavigate('next');
    else if (dx > minSwipe && hasPrev) onNavigate('prev');
    setTouchStartX(null);
  };

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
        className="relative max-w-full max-h-full flex flex-col items-center justify-center w-full"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Button
          variant="ghost"
          size="sm"
          className="absolute -top-10 right-0 text-white hover:bg-white/20 z-10"
          onClick={onClose}
        >
          Close
        </Button>

        <div className="relative flex items-center justify-center w-full">
          {/* Previous */}
          {hasPrev && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate('prev');
              }}
              className="absolute left-0 z-10 flex h-12 w-12 min-w-[48px] items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white/50 -translate-x-2 sm:translate-x-0 sm:left-2"
              aria-label="Previous"
            >
              <span className="text-2xl leading-none">‹</span>
            </button>
          )}

          {/* Content */}
          <div className="mx-2 sm:mx-4">
            {isImage && isReady && displayUrl ? (
              <img
                src={displayUrl}
                alt={item.caption || item.mediaId}
                className="max-w-full max-h-[85vh] object-contain rounded"
                draggable={false}
              />
            ) : item.type === 'video' && isReady && item.originalUrl ? (
              <video
                key={item.mediaId}
                src={item.originalUrl}
                controls
                autoPlay
                className="max-w-full max-h-[85vh] rounded"
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
          </div>

          {/* Next */}
          {hasNext && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate('next');
              }}
              className="absolute right-0 z-10 flex h-12 w-12 min-w-[48px] items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white/50 translate-x-2 sm:translate-x-0 sm:right-2"
              aria-label="Next"
            >
              <span className="text-2xl leading-none">›</span>
            </button>
          )}
        </div>

        {/* Caption + position + download */}
        <div className="mt-2 w-full max-w-full shrink-0 flex flex-col items-center gap-1">
          {media.length > 1 && (
            <p className="text-white/80 text-sm">
              {currentIndex + 1} / {media.length}
            </p>
          )}
          {(item.caption || item.uploadedBy) && (
            <div className="bg-black/70 text-white text-sm p-3 rounded text-center max-w-full">
              {item.caption && <p>{item.caption}</p>}
              {item.uploadedBy && <p className="text-winter-gray">— {item.uploadedBy}</p>}
            </div>
          )}
          {isReady && item.originalUrl && (
            <a
              href={item.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-white/90 hover:text-white underline mt-1"
              onClick={(e) => e.stopPropagation()}
            >
              {item.type === 'image' ? 'Download original image' : 'Download video'}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
