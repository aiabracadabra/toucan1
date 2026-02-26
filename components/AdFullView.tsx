'use client';

import { useEffect, useState } from 'react';
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

export interface MetaCreative {
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

interface AdFullViewProps {
  ad: AdData;
  isTopPerformer: boolean;
  metaCreative: MetaCreative | null;
  isLoadingCreative: boolean;
  onClose: () => void;
}

export default function AdFullView({
  ad,
  isTopPerformer,
  metaCreative,
  isLoadingCreative,
  onClose,
}: AdFullViewProps) {
  const [selectedAssetIndex, setSelectedAssetIndex] = useState(0);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const destinationLinkResult = validateUrl(metaCreative?.destinationUrl ?? ad.destinationLink);
  const headline = metaCreative?.headline ?? ad.headline;
  const body = metaCreative?.body ?? ad.body;
  const assets: NotionAsset[] = ad.assets ?? [];

  // CPM: derived from spend + impressions
  const cpm =
    ad.spend !== null && ad.impressions !== null && ad.impressions > 0
      ? (ad.spend / ad.impressions) * 1000
      : null;

  // Secondary metrics: pull from raw Meta API fields if present
  const rawReach = ad.raw['reach'];
  const reach =
    typeof rawReach === 'number' ? rawReach :
    typeof rawReach === 'string' && rawReach !== '' ? parseInt(rawReach, 10) : null;

  const rawCtr = ad.raw['ctr'];
  const ctr =
    typeof rawCtr === 'number' ? rawCtr :
    typeof rawCtr === 'string' && rawCtr !== '' ? parseFloat(rawCtr) : null;

  const rawCpc = ad.raw['cpc'];
  const cpc =
    typeof rawCpc === 'number' ? rawCpc :
    typeof rawCpc === 'string' && rawCpc !== '' ? parseFloat(rawCpc) : null;

  // Whether we have a real playable video (determines media container size)
  const isVideoMode = metaCreative?.videoStatus === 'ok' && !!metaCreative?.videoSource;

  // All supplemental metrics shown in right column below primary KPI grid
  const rightColSecondary: { label: string; value: string }[] = [];
  if (ad.impressions !== null) {
    rightColSecondary.push({ label: 'Impressions', value: formatInteger(ad.impressions) });
  }
  if (reach !== null && !isNaN(reach)) {
    rightColSecondary.push({ label: 'Reach', value: formatInteger(reach) });
  }
  if (ctr !== null && !isNaN(ctr)) {
    rightColSecondary.push({ label: 'CTR', value: `${ctr.toFixed(2)}%` });
  }
  if (cpc !== null && !isNaN(cpc)) {
    rightColSecondary.push({ label: 'CPC', value: formatCurrency(cpc) });
  }

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      <div className="max-w-[1200px] mx-auto px-8 py-10">

        {/* ── Back ────────────────────────────────────────────────────────── */}
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-700 transition-colors group mb-10"
        >
          <svg
            className="w-4 h-4 transition-transform group-hover:-translate-x-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </button>

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-6 mb-8">
          <div className="min-w-0 flex-1">
            {isTopPerformer && (
              <span className="inline-flex items-center mb-2 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                Top Performer
              </span>
            )}
            <h1
              className="text-2xl font-bold text-gray-900 leading-tight"
              title={formatString(ad.adName)}
            >
              {formatString(ad.adName)}
            </h1>
            {(ad.adSet || ad.campaignName) && (
              <div className="mt-2 space-y-1 max-w-2xl">
                {ad.adSet && (
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest shrink-0 w-[72px]">Ad Set</span>
                    <span className="text-sm text-gray-600 font-normal line-clamp-2" title={ad.adSet}>{ad.adSet}</span>
                  </div>
                )}
                {ad.campaignName && (
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest shrink-0 w-[72px]">Campaign</span>
                    <span className="text-sm text-gray-600 font-normal line-clamp-2" title={ad.campaignName}>{ad.campaignName}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <StatusBadge status={ad.status} />
        </div>

        <hr className="border-gray-100 mb-10" />

        {/* ── Main analytics block ────────────────────────────────────────── */}
        <div className="flex gap-12 items-start">

          {/* LEFT — Media */}
          <div className="w-[460px] shrink-0">
            <div
              className="relative w-full rounded-xl overflow-hidden bg-gray-100"
              style={isVideoMode
                ? { aspectRatio: '9 / 16', maxHeight: '540px' }
                : { height: '200px' }
              }
            >
              <MediaFrame
                metaCreative={metaCreative}
                isLoadingCreative={isLoadingCreative}
                assets={assets}
                selectedAssetIndex={selectedAssetIndex}
                autoplay
                compact={!isVideoMode}
              />
            </div>

            {assets.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                {assets.map((asset, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedAssetIndex(i)}
                    className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-colors ${
                      i === selectedAssetIndex ? 'border-blue-500' : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}

            {metaCreative?.fallbackMessage && (
              <p className="text-xs text-gray-400 mt-2">{metaCreative.fallbackMessage}</p>
            )}

            {/* Ad copy */}
            <div className="mt-6 space-y-4">
              <CopyBlock label="Headline" value={headline} emptyText="Not provided" />
              {body?.trim() && <CopyBlock label="Body" value={body} multiline />}
              {destinationLinkResult.valid && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Destination
                  </p>
                  <a
                    href={destinationLinkResult.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-start gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline break-all leading-snug"
                  >
                    <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    {truncateUrl(destinationLinkResult.url, 40)}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — KPI grid */}
          <div className="flex-1 min-w-0 pt-0.5">

            {/* Delivery status pill */}
            {ad.status && (
              <div className="flex items-center gap-2 mb-6">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Delivery</span>
                <span className="text-xs font-medium text-gray-600 capitalize bg-gray-100 px-2 py-0.5 rounded-full">
                  {ad.status}
                </span>
              </div>
            )}

            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
              Key Metrics
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <KpiCard label="ROAS"      value={formatROAS(ad.roas)}         sub="Return on ad spend"      large />
              <KpiCard label="Purchases" value={formatInteger(ad.purchases)} sub="Total conversions"             />
              <KpiCard label="Spend"     value={formatCurrency(ad.spend)}    sub="Total budget used"             />
              <KpiCard label="CPA"       value={formatCurrency(ad.cpa)}      sub="Cost per purchase"             />
              <KpiCard label="CPM"       value={formatCurrency(cpm)}         sub="Cost per 1k impressions"       />
              <KpiCard label="Frequency" value={formatDecimal(ad.frequency)} sub="Avg. views per person"         />
            </div>

            {/* Impressions, Reach, CTR, CPC — directly below primary grid */}
            {rightColSecondary.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                {rightColSecondary.map((m) => (
                  <KpiCard key={m.label} label={m.label} value={m.value} />
                ))}
              </div>
            )}
          </div>

        </div>


      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const s = status.toLowerCase();
  const cls =
    s === 'active'                        ? 'bg-green-100  text-green-700'  :
    s === 'paused'                        ? 'bg-yellow-100 text-yellow-700' :
    s === 'completed' || s === 'ended'    ? 'bg-blue-100   text-blue-700'   :
    s === 'error'     || s === 'rejected' ? 'bg-red-100    text-red-700'    :
                                            'bg-gray-100   text-gray-700';
  return (
    <span className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium capitalize ${cls}`}>
      {s === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
      {status}
    </span>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  large = false,
}: {
  label: string;
  value: string;
  sub?: string;
  large?: boolean;
}) {
  return (
    <div className="rounded-xl p-5 border border-gray-100 bg-gray-50">
      <dt className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">{label}</dt>
      <dd className={`tabular-nums font-bold text-gray-900 leading-none ${large ? 'text-4xl' : 'text-3xl'}`}>
        {value}
      </dd>
      {sub && <p className="text-xs text-gray-400 mt-2">{sub}</p>}
    </div>
  );
}

// ─── Copy Block ───────────────────────────────────────────────────────────────

function CopyBlock({
  label,
  value,
  emptyText,
  multiline = false,
}: {
  label: string;
  value: string | null;
  emptyText?: string;
  multiline?: boolean;
}) {
  const text = value?.trim() || null;
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{label}</p>
      <p className={`text-sm leading-relaxed ${text ? 'text-gray-900' : 'text-gray-400 italic'} ${multiline ? 'whitespace-pre-wrap break-words' : ''}`}>
        {text ?? (emptyText ?? '-')}
      </p>
    </div>
  );
}

// ─── Media Frame ──────────────────────────────────────────────────────────────
// Renders inside a relative container; all children are absolute inset-0.

function MediaFrame({
  metaCreative,
  isLoadingCreative,
  assets,
  selectedAssetIndex,
  autoplay = false,
  compact = false,
}: {
  metaCreative: MetaCreative | null;
  isLoadingCreative: boolean;
  assets: NotionAsset[];
  selectedAssetIndex: number;
  autoplay?: boolean;
  compact?: boolean;
}) {
  const status = metaCreative?.videoStatus ?? null;
  const selectedAsset = assets.length > 0
    ? assets[Math.min(selectedAssetIndex, assets.length - 1)]
    : null;

  if (isLoadingCreative) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <svg className="w-5 h-5 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (status === 'ok' && metaCreative?.videoSource) {
    return (
      <video
        src={metaCreative.videoSource}
        poster={metaCreative.thumbnailUrl ?? undefined}
        controls
        autoPlay={autoplay}
        muted={autoplay}
        loop={autoplay}
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />
    );
  }

  if (metaCreative?.thumbnailUrl) {
    return (
      <>
        <img
          src={metaCreative.thumbnailUrl}
          alt="Creative"
          className={`absolute inset-0 w-full h-full ${compact ? 'object-contain' : 'object-cover'}`}
          loading="lazy"
        />
        {status === 'thumbnail_only' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/50 rounded-full p-4">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}
      </>
    );
  }

  if (selectedAsset) {
    return (
      <img
        src={selectedAsset.url}
        alt={selectedAsset.name}
        className={`absolute inset-0 w-full h-full ${compact ? 'object-contain' : 'object-cover'}`}
        loading="lazy"
      />
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300">
      <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <p className="text-sm text-gray-400">No creative</p>
    </div>
  );
}
