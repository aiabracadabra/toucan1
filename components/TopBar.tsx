'use client';

import { useState } from 'react';
import { Filters, SortOption } from '@/types';

const syncDateOptions = [
  { value: 'last_30d', label: 'Last 30 days' },
  { value: 'last_90d', label: 'Last 90 days' },
  { value: 'custom',   label: 'Custom range'  },
];

interface TopBarProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  onMetaSync: () => void;
  isSyncing: boolean;
  syncDateRange: string;
  onSyncDateRangeChange: (range: string) => void;
  syncCustomSince: string;
  syncCustomUntil: string;
  onSyncCustomSinceChange: (date: string) => void;
  onSyncCustomUntilChange: (date: string) => void;
  onReset: () => void;
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'roas_desc',        label: 'ROAS (High to Low)'        },
  { value: 'cpa_asc',          label: 'CPA (Low to High)'         },
  { value: 'spend_desc',       label: 'Spend (High to Low)'       },
  { value: 'purchases_desc',   label: 'Purchases (High to Low)'   },
  { value: 'impressions_desc', label: 'Impressions (High to Low)' },
  { value: 'frequency_asc',    label: 'Frequency (Low to High)'   },
];

export default function TopBar({
  filters,
  onFiltersChange,
  onMetaSync,
  isSyncing,
  syncDateRange,
  onSyncDateRangeChange,
  syncCustomSince,
  syncCustomUntil,
  onSyncCustomSinceChange,
  onSyncCustomUntilChange,
  onReset,
}: TopBarProps) {
  const [showFilters, setShowFilters] = useState(false);

  const isCustom = syncDateRange === 'custom';
  const customValid =
    isCustom &&
    syncCustomSince.length > 0 &&
    syncCustomUntil.length > 0 &&
    syncCustomSince <= syncCustomUntil;
  const syncDisabled = isSyncing || (isCustom && !customValid);

  const activeFilterCount = [
    filters.sortBy !== 'purchases_desc',
    filters.activeOnly,
    filters.minSpend !== null,
  ].filter(Boolean).length;

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2 sticky top-0 z-20 space-y-2">

      {/* ── Row 1: primary actions ─────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">

        {/* Sync controls: preset selector + optional custom dates + sync button */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <select
            value={syncDateRange}
            onChange={(e) => onSyncDateRangeChange(e.target.value)}
            disabled={isSyncing}
            className="px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {syncDateOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {isCustom && (
            <>
              <input
                type="date"
                value={syncCustomSince}
                max={syncCustomUntil || undefined}
                onChange={(e) => onSyncCustomSinceChange(e.target.value)}
                disabled={isSyncing}
                className="px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:opacity-60"
                aria-label="Start date"
              />
              <span className="text-sm text-gray-400 shrink-0">→</span>
              <input
                type="date"
                value={syncCustomUntil}
                min={syncCustomSince || undefined}
                onChange={(e) => onSyncCustomUntilChange(e.target.value)}
                disabled={isSyncing}
                className="px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:opacity-60"
                aria-label="End date"
              />
            </>
          )}

          <button
            onClick={onMetaSync}
            disabled={syncDisabled}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSyncing ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Syncing…
              </>
            ) : (
              'Meta Sync'
            )}
          </button>
        </div>

        {/* Search + Filters toggle — pushed to the right */}
        <div className="flex items-center gap-2 ml-auto">
          <input
            type="text"
            placeholder="Search ads…"
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="w-44 px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'border-blue-300 bg-blue-50 text-blue-700'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 6h18M7 12h10M11 18h2" />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-xs font-medium leading-none">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Row 2: advanced filters (collapsible) ─────────────────────── */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">

          {/* Sort */}
          <select
            value={filters.sortBy}
            onChange={(e) => onFiltersChange({ ...filters, sortBy: e.target.value as SortOption })}
            className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Active only */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filters.activeOnly}
              onChange={(e) => onFiltersChange({ ...filters, activeOnly: e.target.checked })}
              className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Active only</span>
          </label>

          {/* Min spend */}
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-gray-600 shrink-0">Min spend</span>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              value={filters.minSpend ?? ''}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  minSpend: e.target.value ? parseFloat(e.target.value) : null,
                })
              }
              className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Reset */}
          <button
            onClick={onReset}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
