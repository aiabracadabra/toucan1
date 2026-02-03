'use client';

import { useEffect, useCallback } from 'react';
import { AdData } from '@/types';
import {
  formatCurrency,
  formatROAS,
  formatInteger,
  formatDecimal,
  formatString,
  validateUrl,
  truncateUrl,
} from '@/lib/formatters';

interface DetailsDrawerProps {
  ad: AdData | null;
  isTopPerformer: boolean;
  onClose: () => void;
}

export default function DetailsDrawer({ ad, isTopPerformer, onClose }: DetailsDrawerProps) {
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

  // Validate URLs
  const destinationLinkResult = validateUrl(ad.destinationLink);
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
        className="fixed right-0 top-0 h-full w-full sm:w-[400px] bg-white shadow-2xl z-40 overflow-y-auto"
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

          {/* Key Metrics Grid */}
          <section className="mb-8">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Key Metrics
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <MetricCard label="Impressions" value={formatInteger(ad.impressions)} />
              <MetricCard label="Spend" value={formatCurrency(ad.spend)} />
              <MetricCard label="Purchases" value={formatInteger(ad.purchases)} />
              <MetricCard label="CPA" value={formatCurrency(ad.cpa)} />
              <MetricCard
                label="ROAS"
                value={formatROAS(ad.roas)}
                highlight={ad.roas !== null && ad.roas >= 3}
                negative={ad.roas !== null && ad.roas < 1}
              />
              <MetricCard label="Frequency" value={formatDecimal(ad.frequency)} />
            </div>
          </section>

          {/* Creative Text Section */}
          <section className="mb-8">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Creative
            </h3>
            <div className="space-y-4">
              <CreativeField label="Headline" value={ad.headline} />
              <CreativeField label="Body" value={ad.body} multiline />
            </div>
          </section>

          {/* Links Section */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
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
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
        Unknown
      </span>
    );
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
function MetricCard({
  label,
  value,
  highlight = false,
  negative = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
      <dt className="text-xs font-medium text-gray-500 mb-1">{label}</dt>
      <dd
        className={`text-lg font-semibold font-mono ${
          highlight ? 'text-green-600' : negative ? 'text-red-600' : 'text-gray-900'
        }`}
      >
        {value}
      </dd>
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
