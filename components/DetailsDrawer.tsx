'use client';

import { useEffect, useCallback, useState } from 'react';
import AdFullView from '@/components/AdFullView';
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
  const [showFullView, setShowFullView] = useState(false);

  // Reset and fetch Meta creative whenever the ad changes
  useEffect(() => {
    setSelectedAssetIndex(0);
    setMetaCreative(null);
    setShowFullView(false);

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

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); },
    [onClose]
  );

  useEffect(() => {
    if (ad) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [ad, handleKeyDown]);

  if (!ad) return null;

  const destinationLinkResult = validateUrl(metaCreative?.destinationUrl ?? ad.destinationLink);
  const headline = metaCreative?.headline ?? ad.headline;
  const body = metaCreative?.body ?? ad.body;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className="fixed right-0 top-0 h-full w-full sm:w-[460px] bg-white shadow-2xl z-40 flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-4">

            {/* Header: name, campaign, ad set, status */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {isTopPerformer && (
                  <span className="inline-flex items-center mb-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    Top Performer
                  </span>
                )}
                <h2 id="drawer-title" className="text-base font-bold text-gray-900 break-words leading-snug">
                  {formatString(ad.adName)}
                </h2>
                {ad.campaignName && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate" title={ad.campaignName}>
                    {ad.campaignName}
                  </p>
                )}
                {ad.adSet && (
                  <p className="text-xs text-gray-400 truncate" title={ad.adSet}>
                    {ad.adSet}
                  </p>
                )}
                <div className="mt-2">
                  <StatusBadge status={ad.status} />
                </div>
              </div>

              <button
                onClick={onClose}
                className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close drawer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Key metrics — 2-col compact grid */}
            <div className="grid grid-cols-2 gap-2">
              <MetricCard label="ROAS"        value={formatROAS(ad.roas)}           />
              <MetricCard label="Purchases"   value={formatInteger(ad.purchases)}   />
              <MetricCard label="Spend"       value={formatCurrency(ad.spend)}      />
              <MetricCard label="CPA"         value={formatCurrency(ad.cpa)}        />
              <MetricCard label="Impressions" value={formatInteger(ad.impressions)} />
              <MetricCard label="Frequency"   value={formatDecimal(ad.frequency)}   />
            </div>

            <hr className="border-gray-100" />

            {/* Creative — unified 9:16 media container */}
            <div>
              <MediaContainer
                ad={ad}
                metaCreative={metaCreative}
                isLoadingCreative={metaCreativeLoading}
                selectedAssetIndex={selectedAssetIndex}
                onSelectAsset={setSelectedAssetIndex}
              />

              {metaCreative?.fallbackMessage && (
                <p className="mt-1.5 text-xs text-gray-400">{metaCreative.fallbackMessage}</p>
              )}

              {/* Headline */}
              <div className="mt-3">
                <p className="text-xs font-medium text-gray-500 mb-1">Headline</p>
                <p className={`text-sm leading-snug ${headline?.trim() ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                  {headline?.trim() || 'Not provided'}
                </p>
              </div>

              {/* Body (only when present) */}
              {body?.trim() && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-gray-500 mb-1">Body</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
                    {body.trim()}
                  </p>
                </div>
              )}

              {/* Destination link */}
              {destinationLinkResult.valid && (
                <a
                  href={destinationLinkResult.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  <span className="break-all">{truncateUrl(destinationLinkResult.url, 48)}</span>
                </a>
              )}
            </div>

          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="shrink-0 border-t border-gray-100 px-5 py-3 flex items-center justify-between gap-3 bg-white">
          <p className="text-xs text-gray-400">
            Press{' '}
            <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-500 font-mono text-xs">ESC</kbd>
            {' '}to close
          </p>
          <button
            onClick={() => setShowFullView(true)}
            className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Open Full View
          </button>
        </div>
      </aside>

      {showFullView && (
        <AdFullView
          ad={ad}
          isTopPerformer={isTopPerformer}
          metaCreative={metaCreative}
          isLoadingCreative={metaCreativeLoading}
          onClose={() => setShowFullView(false)}
        />
      )}
    </>
  );
}

// ─── Status Badge ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;

  const s = status.toLowerCase();
  let colorClasses = 'bg-gray-100 text-gray-700';
  let icon: React.ReactNode = null;

  if (s === 'active') {
    colorClasses = 'bg-green-100 text-green-700';
    icon = <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse" />;
  } else if (s === 'paused') {
    colorClasses = 'bg-yellow-100 text-yellow-700';
    icon = (
      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    );
  } else if (s === 'completed' || s === 'ended') {
    colorClasses = 'bg-blue-100 text-blue-700';
    icon = (
      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    );
  } else if (s === 'error' || s === 'rejected') {
    colorClasses = 'bg-red-100 text-red-700';
    icon = (
      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    );
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${colorClasses}`}>
      {icon}
      {status}
    </span>
  );
}

// ─── Metric Card ────────────────────────────────────────────────────────────

function MetricCard({ label, value }: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg p-3 border bg-gray-50 border-gray-100">
      <dt className="text-xs font-medium text-gray-500 mb-0.5">{label}</dt>
      <dd className="text-sm tabular-nums break-words font-medium text-gray-900">
        {value}
      </dd>
    </div>
  );
}

// ─── Unified Media Container (9:16, all sources) ────────────────────────────

function MediaContainer({
  ad,
  metaCreative,
  isLoadingCreative,
  selectedAssetIndex,
  onSelectAsset,
}: {
  ad: AdData;
  metaCreative: MetaCreative | null;
  isLoadingCreative: boolean;
  selectedAssetIndex: number;
  onSelectAsset: (index: number) => void;
}) {
  const status = metaCreative?.videoStatus ?? null;
  const assets: NotionAsset[] = ad.assets ?? [];
  const hasAssets = assets.length > 0;
  const selectedAsset = hasAssets ? assets[Math.min(selectedAssetIndex, assets.length - 1)] : null;

  return (
    <div>
      {/* Fixed-frame container: 9:16 portrait, max 420px tall */}
      <div
        className="relative w-full rounded-xl overflow-hidden bg-gray-100"
        style={{ aspectRatio: '9 / 16', maxHeight: '420px' }}
      >
        {isLoadingCreative ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-5 h-5 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>

        ) : status === 'ok' ? (
          <video
            src={metaCreative!.videoSource!}
            poster={metaCreative!.thumbnailUrl ?? undefined}
            controls
            className="absolute inset-0 w-full h-full object-cover"
          />

        ) : metaCreative?.thumbnailUrl ? (
          <>
            <img
              src={metaCreative.thumbnailUrl}
              alt="Creative"
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
            {status === 'thumbnail_only' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-black/50 rounded-full p-3">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            )}
          </>

        ) : selectedAsset ? (
          <img
            src={selectedAsset.url}
            alt={selectedAsset.name}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />

        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300">
            <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-gray-400">No creative</p>
          </div>
        )}
      </div>

      {/* Notion asset thumbnail strip (multi-asset only) */}
      {hasAssets && assets.length > 1 && (
        <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
          {assets.map((asset, index) => (
            <button
              key={index}
              onClick={() => onSelectAsset(index)}
              className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-colors ${
                index === selectedAssetIndex ? 'border-blue-500' : 'border-transparent hover:border-gray-300'
              }`}
            >
              <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
