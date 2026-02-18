import React, { useState, useCallback, useEffect } from 'react';
import { Link, useSearchParams, useParams, useNavigate } from 'react-router-dom';
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
import { useCurrentOlympics, useListMediaPaginated, useEvents, useTeams } from '../hooks/useApi';
import { useGalleryAuth } from '../hooks/useGalleryAuth';
import { apiClient } from '../lib/api';
import type { MediaItem, Event, Team } from '../lib/api';

function eventsByTimeOrder(a: Event, b: Event): number {
  const dayA = a.scheduledDay === 1 || a.scheduledDay === 2 ? a.scheduledDay : 999;
  const dayB = b.scheduledDay === 1 || b.scheduledDay === 2 ? b.scheduledDay : 999;
  if (dayA !== dayB) return dayA - dayB;
  if (!a.scheduledTime && !b.scheduledTime) return 0;
  if (!a.scheduledTime) return 1;
  if (!b.scheduledTime) return -1;
  return a.scheduledTime.localeCompare(b.scheduledTime);
}

export const Gallery: React.FC = () => {
  const { data: olympics, loading: olympicsLoading, error: olympicsError, execute: refetchOlympics } =
    useCurrentOlympics();
  const params = useParams<{ year?: string; mediaId?: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Year: from route when present (/gallery/2025 or /gallery/2025/media/xyz), else current olympics
  const routeYear = params.year ? parseInt(params.year, 10) : null;
  const year = (routeYear != null && !Number.isNaN(routeYear) ? routeYear : null) ?? olympics?.year ?? null;
  const routeMediaId = params.mediaId ?? null;

  const galleryAuth = useGalleryAuth(year);
  const { isAuthenticated, token, authError, authenticate, logout } = galleryAuth;

  useEffect(() => {
    apiClient.setGalleryToken(token);
  }, [token]);

  const { data: eventsData } = useEvents(year);
  const { data: teamsData } = useTeams(year);
  const [eventFilter, setEventFilter] = useState<string>(() => searchParams.get('eventId') ?? '');
  const [teamFilterIds, setTeamFilterIds] = useState<string[]>(() => {
    const t = searchParams.get('teamId') ?? '';
    return t ? t.split(',').map((id) => id.trim()).filter(Boolean) : [];
  });
  const [personFilter, setPersonFilter] = useState<string>(() => searchParams.get('person') ?? '');

  useEffect(() => {
    const eventId = searchParams.get('eventId') ?? '';
    const t = searchParams.get('teamId') ?? '';
    const person = searchParams.get('person') ?? '';
    setEventFilter(eventId);
    setTeamFilterIds(t ? t.split(',').map((id) => id.trim()).filter(Boolean) : []);
    setPersonFilter(person);
  }, [searchParams]);

  const {
    media,
    nextToken,
    loading: mediaLoading,
    loadingMore: mediaLoadingMore,
    error: mediaError,
    refetch: refetchMedia,
    loadMore,
  } = useListMediaPaginated(
    year != null && isAuthenticated ? year : null,
    {
      ...(eventFilter && { eventId: eventFilter }),
      ...(teamFilterIds.length > 0 && { teamId: teamFilterIds }),
      ...(personFilter.trim() && { person: personFilter.trim() }),
    },
    isAuthenticated
  );
  const events = eventsData?.events ?? [];
  const teams = teamsData?.teams ?? [];

  const [lightboxItem, setLightboxItem] = useState<MediaItem | null>(null);
  const [showUploadCard, setShowUploadCard] = useState(false);

  // Open image = navigate to that image's route. URL is the shareable link.
  const openLightbox = useCallback(
    (item: MediaItem) => {
      if (year == null) return;
      setLightboxItem(item);
      navigate(`/gallery/${year}/media/${encodeURIComponent(item.mediaId)}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`);
    },
    [year, navigate, searchParams]
  );

  const closeLightbox = useCallback(() => {
    setLightboxItem(null);
    if (year != null) navigate(`/gallery/${year}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`);
  }, [year, navigate, searchParams]);

  const handleLightboxNavigate = useCallback(
    (dir: 'prev' | 'next') => {
      if (!lightboxItem || year == null) return;
      const idx = media.findIndex((m) => m.mediaId === lightboxItem.mediaId);
      if (idx === -1) return;
      const nextIdx = dir === 'next' ? idx + 1 : idx - 1;
      const next = media[nextIdx];
      if (next) {
        setLightboxItem(next);
        navigate(`/gallery/${year}/media/${encodeURIComponent(next.mediaId)}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`);
      }
    },
    [lightboxItem, media, year, navigate, searchParams]
  );

  const handleItemUpdated = useCallback((updated: MediaItem) => {
    setLightboxItem(updated);
    refetchMedia();
  }, [refetchMedia]);

  // When route has mediaId, open lightbox for that item (from list or fetch). URL is source of truth.
  useEffect(() => {
    if (!routeMediaId || !isAuthenticated || year == null) return;
    const inList = media.find((m) => m.mediaId === routeMediaId);
    if (inList) {
      setLightboxItem(inList);
      return;
    }
    if (mediaLoading) return;
    let cancelled = false;
    apiClient.getMedia(year, routeMediaId).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) setLightboxItem(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, [routeMediaId, year, isAuthenticated, media, mediaLoading]);

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
                  ...[...events].sort(eventsByTimeOrder).map((e) => ({ value: e.eventId, label: e.name || e.eventId })),
                ]}
                value={eventFilter}
                onChange={(e) => {
                  const v = e.target.value;
                  setEventFilter(v);
                  setSearchParams((prev) => {
                    const p = new URLSearchParams(prev);
                    if (v) p.set('eventId', v);
                    else p.delete('eventId');
                    return p;
                  });
                }}
              />
              <div>
                <span className="block text-sm font-medium text-winter-dark mb-2">Teams</span>
                <div className="flex flex-wrap gap-3">
                  {teams.map((t) => (
                    <label
                      key={t.teamId}
                      className="inline-flex items-center gap-2 cursor-pointer text-sm text-winter-dark"
                    >
                      <input
                        type="checkbox"
                        checked={teamFilterIds.includes(t.teamId)}
                        onChange={() => {
                          const next = teamFilterIds.includes(t.teamId)
                            ? teamFilterIds.filter((id) => id !== t.teamId)
                            : [...teamFilterIds, t.teamId];
                          setTeamFilterIds(next);
                          setSearchParams((prev) => {
                            const p = new URLSearchParams(prev);
                            if (next.length) p.set('teamId', next.join(','));
                            else p.delete('teamId');
                            return p;
                          });
                        }}
                        className="rounded border-gray-300 text-winter-accent focus:ring-winter-accent"
                      />
                      <span>{t.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <Input
                label="Person"
                placeholder="Filter by name"
                value={personFilter}
                onChange={(e) => {
                  const v = e.target.value;
                  setPersonFilter(v);
                  setSearchParams((prev) => {
                    const p = new URLSearchParams(prev);
                    if (v.trim()) p.set('person', v.trim());
                    else p.delete('person');
                    return p;
                  });
                }}
              />
            </div>
            {(eventFilter || teamFilterIds.length > 0 || personFilter.trim()) && (
              <div className="mt-4 pt-3 border-t border-gray-200">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEventFilter('');
                    setTeamFilterIds([]);
                    setPersonFilter('');
                    setSearchParams((prev) => {
                      const p = new URLSearchParams(prev);
                      p.delete('eventId');
                      p.delete('teamId');
                      p.delete('person');
                      return p;
                    });
                  }}
                >
                  Clear filters
                </Button>
              </div>
            )}
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
                  onClick={() => openLightbox(item)}
                />
              ))}
            </div>
            {nextToken && (
              <div className="mt-6 flex justify-center">
                <Button
                  variant="secondary"
                  onClick={loadMore}
                  disabled={mediaLoadingMore}
                >
                  {mediaLoadingMore ? 'Loading…' : 'Load more'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Lightbox */}
      {lightboxItem && (
        <Lightbox
          item={lightboxItem}
          media={media}
          year={year ?? 0}
          events={events}
          teams={teams}
          onClose={closeLightbox}
          onNavigate={handleLightboxNavigate}
          onItemUpdated={handleItemUpdated}
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
  const thumbUrl = item.thumbnailUrl ?? item.displayUrl;
  const [videoThumbFailed, setVideoThumbFailed] = useState(false);
  const showVideoThumb = item.type === 'video' && thumbUrl && !videoThumbFailed;

  return (
    <button
      type="button"
      onClick={onClick}
      className="aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-winter-accent focus:ring-offset-2"
    >
      {isImage && thumbUrl ? (
        <img
          src={thumbUrl}
          alt={item.caption || item.mediaId}
          className="w-full h-full object-cover"
          crossOrigin="anonymous"
        />
      ) : showVideoThumb ? (
        <div className="relative w-full h-full">
          <img
            src={thumbUrl}
            alt=""
            className="w-full h-full object-cover"
            crossOrigin="anonymous"
            onError={() => setVideoThumbFailed(true)}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl">▶️</span>
          </div>
        </div>
      ) : item.type === 'video' ? (
        <div className="w-full h-full flex items-center justify-center bg-gray-200 text-4xl">
          ▶️
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-winter-gray text-sm p-2">
          <span>📷</span>
          <span className="text-xs">No preview</span>
        </div>
      )}
    </button>
  );
}

function Lightbox({
  item,
  media,
  year,
  events,
  teams,
  onClose,
  onNavigate,
  onItemUpdated,
}: {
  item: MediaItem;
  media: MediaItem[];
  year: number;
  events: Event[];
  teams: Team[];
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  onItemUpdated: (updated: MediaItem) => void;
}) {
  const currentIndex = media.findIndex((m) => m.mediaId === item.mediaId);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < media.length - 1;

  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [formCaption, setFormCaption] = useState(item.caption ?? '');
  const [formEventId, setFormEventId] = useState(item.eventId ?? '');
  const [formTeamIds, setFormTeamIds] = useState<string[]>(() =>
    (item.teamIds?.length ? item.teamIds : item.teamId ? [item.teamId] : [])
  );
  const [formPersons, setFormPersons] = useState<string[]>(() => item.tags?.persons ?? []);

  const formMemberOptions = Array.from(
    new Set(teams.filter((t) => formTeamIds.includes(t.teamId)).flatMap((t) => t.members ?? []))
  );

  useEffect(() => {
    setFormCaption(item.caption ?? '');
    setFormEventId(item.eventId ?? '');
    setFormTeamIds(item.teamIds?.length ? item.teamIds : item.teamId ? [item.teamId] : []);
    setFormPersons(item.tags?.persons ?? []);
  }, [item.mediaId, item.caption, item.eventId, item.teamId, item.teamIds, item.tags?.persons]);

  // When teams change, keep only persons still in the new team member list
  useEffect(() => {
    const allowed = new Set(
      teams.filter((t) => formTeamIds.includes(t.teamId)).flatMap((t) => t.members ?? [])
    );
    setFormPersons((prev) => (prev.some((p) => !allowed.has(p)) ? prev.filter((p) => allowed.has(p)) : prev));
  }, [formTeamIds, teams]);

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
  const displayUrl = item.displayUrl ?? item.originalUrl;
  const [downloading, setDownloading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(true);

  useEffect(() => {
    const hasMedia = isImage ? !!displayUrl : !!(item.type === 'video' && item.originalUrl);
    setMediaLoading(!!hasMedia);
  }, [item.mediaId, item.type, isImage, displayUrl, item.originalUrl]);

  const getDownloadFilename = (): string => {
    const ext = item.originalKey?.includes('.')
      ? item.originalKey.slice(item.originalKey.lastIndexOf('.'))
      : item.type === 'video'
      ? '.mp4'
      : '.jpg';
    if (item.originalFileName) {
      const base = item.originalFileName.replace(/[^a-zA-Z0-9._-]/g, '_').trim() || item.mediaId;
      return base.includes('.') ? base : `${base}${ext}`;
    }
    return `${item.mediaId}${ext}`;
  };

  const handleDownload = useCallback(async () => {
    if (!item.originalUrl) return;
    setDownloading(true);
    try {
      const res = await fetch(item.originalUrl);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = getDownloadFilename();
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed', err);
    } finally {
      setDownloading(false);
    }
  }, [item.originalUrl, item.mediaId, item.originalKey, item.originalFileName, item.type]);

  const handleShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed', err);
    }
  }, []);

  const handleSaveInfo = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const allowedPersons = new Set(formMemberOptions);
      const personsToSave = formPersons.filter((p) => allowedPersons.has(p));
      const res = await apiClient.updateMedia(year, item.mediaId, {
        caption: formCaption.trim(),
        eventId: formEventId.trim(),
        teamIds: formTeamIds,
        persons: personsToSave.length ? personsToSave : [],
      });
      if (res.success && res.data) {
        onItemUpdated(res.data);
        setShowInfoPanel(false);
      } else {
        setSaveError(res.error?.message ?? 'Save failed');
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [year, item.mediaId, formCaption, formEventId, formTeamIds, formPersons, formMemberOptions, onItemUpdated]);

  const formatSize = (bytes: number | undefined) => {
    if (bytes == null) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  const formatDate = (s: string | undefined) => {
    if (!s) return '—';
    try {
      const d = new Date(s);
      return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString(undefined, { dateStyle: 'medium' });
    } catch {
      return s;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/90 overflow-hidden"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Media viewer"
    >
      {/* Top bar: reserves space so image is not constrained by overlay */}
      <div className="shrink-0 flex items-start justify-end pt-3 pr-3 pb-1">
        <Button
          variant="ghost"
          size="sm"
          className="z-[60] text-white hover:bg-white/20 shrink-0"
          onClick={onClose}
        >
          Close
        </Button>
      </div>

      {/* Content: fills remaining space above footer */}
      <div
        className="flex-1 min-h-0 flex flex-col items-center justify-center w-full px-2 sm:px-4"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="relative flex flex-1 items-center justify-center w-full min-h-0">
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

          {/* Content: image/video constrained to this area (screen minus top bar and footer) */}
          <div className="flex items-center justify-center max-w-full max-h-full min-w-0 min-h-0 relative w-full h-full">
            {mediaLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10 rounded">
                <Loading size="lg" message="Loading…" />
              </div>
            )}
            {isImage && displayUrl ? (
              <img
                src={displayUrl}
                alt={item.caption || item.mediaId}
                className="max-w-full max-h-full object-contain rounded"
                draggable={false}
                crossOrigin="anonymous"
                onLoad={() => setMediaLoading(false)}
              />
            ) : item.type === 'video' && item.originalUrl ? (
              <video
                key={item.mediaId}
                src={item.originalUrl}
                controls
                autoPlay
                className="max-w-full max-h-full rounded"
                onClick={(e) => e.stopPropagation()}
                crossOrigin="anonymous"
                onLoadedData={() => setMediaLoading(false)}
              />
            ) : (
              <div className="text-white text-center py-8">
                <p>Not available</p>
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

        {/* Footer: reserved space so image stays above this */}
        <div className="shrink-0 w-full max-w-full flex items-center justify-between gap-3 py-2 px-1 text-xs text-white/85">
          <span className="shrink-0">
            {media.length > 1 ? `${currentIndex + 1} / ${media.length}` : '\u00A0'}
          </span>
          <span className="min-w-0 truncate text-center">
            {[item.caption, item.uploadedBy && `— ${item.uploadedBy}`].filter(Boolean).join(' ') || '\u00A0'}
          </span>
          <div className="shrink-0 flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleShare();
              }}
              className="underline hover:text-white"
              aria-label="Copy link"
              title="Copy link"
            >
              {shareCopied ? 'Copied!' : 'Share'}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowInfoPanel((v) => !v);
              }}
              className={`underline hover:text-white ${showInfoPanel ? 'text-white' : ''}`}
              aria-label="Toggle info"
              title="Info"
            >
              ℹ️
            </button>
            {item.originalUrl ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload();
                }}
                disabled={downloading}
                className="underline hover:text-white disabled:opacity-60"
              >
                {downloading ? '…' : 'Download'}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Info overlay panel */}
      {showInfoPanel && (
        <div
          className="absolute inset-0 z-[55] flex items-center justify-center p-4 bg-black/80"
          onClick={(e) => e.stopPropagation()}
        >
          <Card className="w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
            <CardBody className="overflow-y-auto space-y-4">
              <h3 className="text-lg font-semibold text-winter-dark m-0">Photo info</h3>
              <Input
                label="Caption"
                value={formCaption}
                onChange={(e) => setFormCaption(e.target.value)}
                placeholder="Add a caption"
              />
              <div className="text-sm">
                <span className="font-medium text-winter-dark">Uploaded by:</span>{' '}
                <span className="text-winter-gray">{item.uploadedBy ?? '—'}</span>
              </div>
              <Select
                label="Event"
                options={[
                  { value: '', label: '—' },
                  ...[...events].sort(eventsByTimeOrder).map((e) => ({ value: e.eventId, label: e.name || e.eventId })),
                ]}
                value={formEventId}
                onChange={(e) => setFormEventId(e.target.value)}
              />
              <div>
                <span className="block text-sm font-medium text-winter-dark mb-2">Teams</span>
                <div className="flex flex-wrap gap-3">
                  {teams.map((t) => (
                    <label
                      key={t.teamId}
                      className="inline-flex items-center gap-2 cursor-pointer text-sm text-winter-dark"
                    >
                      <input
                        type="checkbox"
                        checked={formTeamIds.includes(t.teamId)}
                        onChange={() => {
                          setFormTeamIds((prev) =>
                            prev.includes(t.teamId)
                              ? prev.filter((id) => id !== t.teamId)
                              : [...prev, t.teamId]
                          );
                        }}
                        className="rounded border-gray-300 text-winter-accent focus:ring-winter-accent"
                      />
                      <span>{t.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              {formMemberOptions.length > 0 ? (
                <div>
                  <span className="block text-sm font-medium text-winter-dark mb-2">People (optional)</span>
                  <p className="text-xs text-winter-gray mb-2">Select from members of the chosen teams</p>
                  <div className="flex flex-wrap gap-2">
                    {formMemberOptions.map((member) => (
                      <label
                        key={member}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-300 bg-white cursor-pointer hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={formPersons.includes(member)}
                          onChange={() =>
                            setFormPersons((prev) =>
                              prev.includes(member) ? prev.filter((p) => p !== member) : [...prev, member]
                            )
                          }
                          className="rounded border-gray-300 text-winter-accent focus:ring-winter-accent"
                        />
                        <span className="text-sm">{member}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-winter-gray">
                  <span className="font-medium text-winter-dark">People:</span> Select one or more teams above to tag people.
                </div>
              )}
              <div className="text-sm text-winter-gray space-y-1 pt-2 border-t border-gray-200">
                <p className="m-0"><span className="font-medium">Filename:</span> {item.originalFileName ?? item.mediaId}</p>
                <p className="m-0"><span className="font-medium">Size:</span> {formatSize(item.fileSize)}</p>
                <p className="m-0"><span className="font-medium">Uploaded:</span> {formatDate(item.createdAt)}</p>
              </div>
              {saveError && (
                <p className="text-red-600 text-sm m-0">{saveError}</p>
              )}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowInfoPanel(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveInfo}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
