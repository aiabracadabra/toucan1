'use client';

import { useEffect, useCallback, useState } from 'react';
import { AdData, NotionAsset } from '@/types';
import {
  formatCurrency,
  formatROAS,
  formatInteger,
  formatDecimal,
  formatString,
  validateUrl,
  truncateUrl,
} from '@/lib/formatters';

type VideoStatus = 'ok' | 'thumbnail_only' | 'not_accessible' | 'post_based' | 'no_video';

interface MetaCreative {
  videoSource: string | null;
  thumbnailUrl: string | null;
  videoStatus: VideoStatus;
  fallbackMessage: string | null;
  body: string | null;
  headline: string | null;
  destinationUrl: string | null;
  videoId: string | null;
  extractionPath: 'a' | 'b' | 'c' | 'd' | null;
  rawCreative: unknown;
}

interface DetailsDrawerProps {
  ad: AdData | null;
  isTopPerformer: boolean;
  onClose: () => void;
}

export default function DetailsDrawer({ ad, isTopPerformer, onClose }: DetailsDrawerProps) {
  const [selectedAssetIndex, setSelectedAssetIndex] = useState(0);
  const [metaCreative, setMetaCreative] = useState<MetaCreative | null>(null);
  const [metaCreativeLoading, setMetaCreativeLoading] = useState(false);

  // Reset and fetch Meta creative whenever the ad changes
  useEffect(() => {
    setSelectedAssetIndex(0);
    setMetaCreative(null);

    if (!ad?.adId) return;

    setMetaCreativeLoading(true);
    fetch(`/api/meta/creative?adId=${encodeURIComponent(ad.adId)}`)
      .then((res) => (res.ok ? (res.json() as Promise<MetaCreative>) : null))
      .catch(() => null)
      .then((creative) => {
        setMetaCreative(creative);
        if (process.env.NODE_ENV === 'development' && creative?.rawCreative) {
          console.log('[Meta creative] ad=%s status=%s', ad.adId, creative.videoStatus, creative.rawCreative);
        }
      })
      .finally(() => setMetaCreativeLoading(false));
  }, [ad?.adId]);

  // ESC key handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (ad) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when drawer is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [ad, handleKeyDown]);

  if (!ad) return null;

  // Validate URLs — prefer Meta API data, fall back to CSV
  const destinationLinkResult = validateUrl(metaCreative?.destinationUrl ?? ad.destinationLink);
  const previewLinkResult = validateUrl(ad.previewLink);

  return (
    <>
      {/* Backdrop - click to close */}
      <div
        className="fixed inset-0 bg-black/20 z-30 transition-opacity backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className="fixed right-0 top-0 h-full w-full sm:w-[45vw] sm:min-w-[420px] bg-white shadow-2xl z-40 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <div className="p-6">
          {/* Header with close button */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex-1 min-w-0">
              {/* Top performer badge */}
              {isTopPerformer && (
                <span className="inline-flex items-center mb-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                  <svg
                    className="w-3.5 h-3.5 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Top Performer
                </span>
              )}

              {/* Ad Name (large title) */}
              <h2
                id="drawer-title"
                className="text-xl font-bold text-gray-900 break-words"
              >
                {formatString(ad.adName)}
              </h2>

              {/* Status badge */}
              <div className="mt-2">
                <StatusBadge status={ad.status} />
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="flex-shrink-0 p-2 -m-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close drawer"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Ad Set */}
          {ad.adSet && (
            <div className="mb-6 text-sm text-gray-500">
              <span className="font-medium">Ad Set:</span> {ad.adSet}
            </div>
          )}

          {/* Creative Assets Section */}
          <CreativeAssetsSection
            assets={ad.assets}
            selectedIndex={selectedAssetIndex}
            onSelectAsset={setSelectedAssetIndex}
            metaCreative={metaCreative}
            isLoadingCreative={metaCreativeLoading}
          />

          {/* Key Metrics Grid */}
          <section className="mb-8">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">
              Key Metrics
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <MetricCard label="Impressions" value={formatInteger(ad.impressions)} />
              <MetricCard label="Spend" value={formatCurrency(ad.spend)} />
              <MetricCard label="Purchases" value={formatInteger(ad.purchases)} />
              <MetricCard label="CPA" value={formatCurrency(ad.cpa)} />
              <MetricCard label="ROAS" value={formatROAS(ad.roas)} />
              <MetricCard label="Frequency" value={formatDecimal(ad.frequency)} />
              {ad.campaignName && (
                <MetricCard label="Campaign" value={ad.campaignName} />
              )}
              {ad.adId && (
                <MetricCard label="Ad ID" value={ad.adId} />
              )}
            </div>
          </section>

          {/* Creative Text Section */}
          <section className="mb-8">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">
              Creative
            </h3>
            <div className="space-y-4">
              <CreativeField label="Headline" value={metaCreative?.headline ?? ad.headline} />
              <CreativeField label="Body" value={metaCreative?.body ?? ad.body} multiline />
            </div>
          </section>

          {/* Links Section */}
          <section>
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">
              Links
            </h3>
            <div className="space-y-4">
              {/* Destination Link */}
              <LinkField
                label="Destination"
                urlResult={destinationLinkResult}
                linkText="Link (ad settings)"
                emptyText="No destination link"
              />

              {/* Preview Link */}
              <PreviewLinkField
                urlResult={previewLinkResult}
                hasValue={!!ad.previewLink}
              />
            </div>
          </section>
        </div>

        {/* Bottom hint for keyboard shortcut */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 px-6 py-3">
          <p className="text-xs text-gray-400 text-center">
            Press <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-600 font-mono">ESC</kbd> to close
          </p>
        </div>
      </aside>
    </>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: string | null }) {
  if (!status) {
    return null;
  }

  const normalizedStatus = status.toLowerCase();
  let colorClasses = 'bg-gray-100 text-gray-700';
  let icon = null;

  if (normalizedStatus === 'active') {
    colorClasses = 'bg-green-100 text-green-700';
    icon = (
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse" />
    );
  } else if (normalizedStatus === 'paused') {
    colorClasses = 'bg-yellow-100 text-yellow-700';
    icon = (
      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    );
  } else if (normalizedStatus === 'completed' || normalizedStatus === 'ended') {
    colorClasses = 'bg-blue-100 text-blue-700';
    icon = (
      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    );
  } else if (normalizedStatus === 'error' || normalizedStatus === 'rejected') {
    colorClasses = 'bg-red-100 text-red-700';
    icon = (
      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    );
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${colorClasses}`}
    >
      {icon}
      {status}
    </span>
  );
}

// Metric Card Component
function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
      <dt className="text-xs font-medium text-gray-500 mb-1">{label}</dt>
      <dd className="text-sm font-normal text-gray-900 tabular-nums break-words">{value}</dd>
    </div>
  );
}

// Creative Field Component
function CreativeField({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string | null;
  multiline?: boolean;
}) {
  const hasValue = value && value.trim() !== '';

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
      <dt className="text-xs font-medium text-gray-500 mb-2">{label}</dt>
      <dd
        className={`text-sm ${
          hasValue ? 'text-gray-900' : 'text-gray-400 italic'
        } ${multiline ? 'whitespace-pre-wrap break-words' : ''}`}
      >
        {hasValue ? value : '-'}
      </dd>
    </div>
  );
}

// Link Field Component
function LinkField({
  label,
  urlResult,
  linkText,
  emptyText,
}: {
  label: string;
  urlResult: { valid: true; url: string } | { valid: false };
  linkText: string;
  emptyText: string;
}) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
      <dt className="text-xs font-medium text-gray-500 mb-2">{label}</dt>
      <dd>
        {urlResult.valid ? (
          <a
            href={urlResult.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            <span className="break-all">{linkText}</span>
          </a>
        ) : (
          <span className="text-sm text-gray-400 italic">{emptyText}</span>
        )}
        {urlResult.valid && (
          <p className="mt-1 text-xs text-gray-400 break-all">
            {truncateUrl(urlResult.url, 50)}
          </p>
        )}
      </dd>
    </div>
  );
}

// Preview Link Field Component with special handling
function PreviewLinkField({
  urlResult,
  hasValue,
}: {
  urlResult: { valid: true; url: string } | { valid: false };
  hasValue: boolean;
}) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
      <dt className="text-xs font-medium text-gray-500 mb-2">Preview Link</dt>
      <dd>
        {urlResult.valid ? (
          <>
            <a
              href={urlResult.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              <svg
                className="w-4 h-4 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              <span>Preview link</span>
            </a>
            {/* Hint about preview link limitations */}
            <p className="mt-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 flex items-start gap-2">
              <svg
                className="w-4 h-4 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>
                Preview may require being logged into the correct Meta account.
              </span>
            </p>
          </>
        ) : hasValue ? (
          // Has a value but it's not a valid URL
          <span className="text-sm text-gray-400 italic">
            Preview link unavailable
          </span>
        ) : (
          // No value at all
          <span className="text-sm text-gray-400 italic">No preview link</span>
        )}
      </dd>
    </div>
  );
}

// ─── Creative Assets Section ───────────────────────────────────────────────
// Rendering priority:
//   1. Loading spinner
//   2. Meta video source            (ok)
//   3. Meta thumbnail / image       (thumbnailUrl present — video thumb, thumbnail_url, or image_url)
//   4. Notion images                (no Meta visual)
//   5. Empty state

const isDev = process.env.NODE_ENV === 'development';

function CreativeAssetsSection({
  assets,
  selectedIndex,
  onSelectAsset,
  metaCreative,
  isLoadingCreative,
}: {
  assets: NotionAsset[];
  selectedIndex: number;
  onSelectAsset: (index: number) => void;
  metaCreative: MetaCreative | null;
  isLoadingCreative: boolean;
}) {
  const hasNotionAssets = assets && assets.length > 0;
  const selectedAsset = hasNotionAssets
    ? assets[Math.min(selectedIndex, assets.length - 1)]
    : null;

  const status = metaCreative?.videoStatus ?? null;

  return (
    <section className="mb-8">
      <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">
        Creative Assets
      </h3>

      {/* 1. Loading */}
      {isLoadingCreative ? (
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 flex items-center justify-center gap-2 text-sm text-gray-400">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading creative…
        </div>

      ) : status === 'ok' ? (
        /* 2. Streamable Meta video */
        <div className="space-y-2">
          <div className="bg-black rounded-xl overflow-hidden">
            <video
              src={metaCreative!.videoSource!}
              poster={metaCreative!.thumbnailUrl ?? undefined}
              controls
              className="w-full max-h-[300px]"
            />
          </div>
          <p className="text-xs text-gray-400">Video from Meta</p>
          {isDev && metaCreative && (
            <p className="text-xs text-gray-300 font-mono">
              path={metaCreative.extractionPath} id={metaCreative.videoId}
            </p>
          )}
        </div>

      ) : metaCreative?.thumbnailUrl ? (
        /* 3. Thumbnail / image from Meta (video thumb, thumbnail_url, or image_url) */
        <div className="space-y-2">
          <div className="relative bg-gray-100 rounded-xl overflow-hidden">
            <img
              src={metaCreative.thumbnailUrl}
              alt="Creative"
              className="w-full h-auto max-h-[360px] object-contain"
              loading="lazy"
            />
            {/* Play icon overlay only for video-without-source */}
            {status === 'thumbnail_only' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-black/50 rounded-full p-3">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            )}
          </div>
          {metaCreative.fallbackMessage && (
            <p className="text-xs text-gray-400">{metaCreative.fallbackMessage}</p>
          )}
          {isDev && (
            <p className="text-xs text-gray-300 font-mono">
              path={metaCreative.extractionPath} id={metaCreative.videoId}
            </p>
          )}
        </div>

      ) : hasNotionAssets ? (
        /* 4. No Meta visual → Notion images */
        <NotionGallery
          assets={assets}
          selectedIndex={selectedIndex}
          onSelectAsset={onSelectAsset}
          selectedAsset={selectedAsset}
        />

      ) : (
        /* 6. Nothing */
        <EmptyCreative />
      )}
    </section>
  );
}

// Sub-component: Notion image gallery
function NotionGallery({
  assets,
  selectedIndex,
  onSelectAsset,
  selectedAsset,
}: {
  assets: NotionAsset[];
  selectedIndex: number;
  onSelectAsset: (index: number) => void;
  selectedAsset: NotionAsset | null;
}) {
  return (
    <div className="space-y-3">
      {selectedAsset && (
        <div className="relative bg-gray-100 rounded-xl overflow-hidden">
          <img
            src={selectedAsset.url}
            alt={selectedAsset.name}
            className="w-full h-auto max-h-[300px] object-contain"
            loading="lazy"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
            <p className="text-xs text-white truncate" title={selectedAsset.name}>
              {selectedAsset.name}
            </p>
          </div>
          {selectedAsset.kind === 'external' && (
            <div className="absolute top-2 right-2">
              <span className="bg-black/50 text-white text-xs px-2 py-1 rounded">External</span>
            </div>
          )}
        </div>
      )}

      {assets.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {assets.map((asset, index) => (
            <button
              key={index}
              onClick={() => onSelectAsset(index)}
              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                index === selectedIndex ? 'border-blue-500' : 'border-transparent hover:border-gray-300'
              }`}
            >
              <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400">
        {assets.length} {assets.length === 1 ? 'asset' : 'assets'} from Notion
      </p>
    </div>
  );
}

// Sub-component: empty state
function EmptyCreative() {
  return (
    <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 text-center">
      <svg className="w-10 h-10 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
      <p className="text-sm text-gray-500">No creative available</p>
    </div>
  );
}

