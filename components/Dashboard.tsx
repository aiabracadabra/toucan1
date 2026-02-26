'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import TopBar from '@/components/TopBar';
import AdsTable from '@/components/AdsTable';
import DetailsDrawer from '@/components/DetailsDrawer';
import { parseFile } from '@/lib/parseFile';
import { exportToCSV } from '@/lib/exportCSV';
import { normalizeMetaInsights, MetaInsightRow } from '@/lib/normalizeMetaInsights';
import { AdData, Filters, SortOption, ParseResult, ParseError, NotionAdAssets } from '@/types';

const defaultFilters: Filters = {
  search: '',
  activeOnly: false,
  minSpend: null,
  sortBy: 'purchases_desc',
};

interface ParseDebugInfo {
  detectedColumns: string[];
  mappedColumns?: Record<string, string>;
  unmappedColumns?: string[];
  warnings?: string[];
  suggestions?: string[];
  hasAdId?: boolean;
  notionStatus?: 'loading' | 'success' | 'error' | 'no-adid';
  notionError?: string;
  assetsLoaded?: number;
}

export default function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [rawData, setRawData] = useState<AdData[]>([]);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [selectedAdIndex, setSelectedAdIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncDateRange, setSyncDateRange] = useState('last_30d');
  const [syncCustomSince, setSyncCustomSince] = useState('');
  const [syncCustomUntil, setSyncCustomUntil] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<ParseDebugInfo | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const debugRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close debug popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (debugRef.current && !debugRef.current.contains(event.target as Node)) {
        setShowDebug(false);
      }
    }
    if (showDebug) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDebug]);

  // Sync URL query param to state on mount and when URL changes
  useEffect(() => {
    const adParam = searchParams.get('ad');
    if (adParam !== null) {
      const index = parseInt(adParam, 10);
      if (!isNaN(index) && index >= 0) {
        setSelectedAdIndex(index);
      }
    } else {
      setSelectedAdIndex(null);
    }
  }, [searchParams]);

  // Update URL when selected ad changes
  const updateUrlWithAdIndex = useCallback(
    (index: number | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (index !== null) {
        params.set('ad', index.toString());
      } else {
        params.delete('ad');
      }
      const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
      router.push(newUrl, { scroll: false });
    },
    [router, searchParams]
  );

  const handleFileUpload = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    setDebugInfo(null);
    setSelectedAdIndex(null);
    setShowDebug(false);

    // Clear URL param when uploading new file
    const params = new URLSearchParams(window.location.search);
    params.delete('ad');
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    router.replace(newUrl, { scroll: false });

    try {
      const result = await parseFile(file);

      if (result.success) {
        const parseResult = result as ParseResult;
        let adsData = parseResult.data;

        const initialDebugInfo: ParseDebugInfo = {
          detectedColumns: parseResult.detectedColumns,
          mappedColumns: parseResult.mappedColumns,
          unmappedColumns: parseResult.unmappedColumns,
          warnings: parseResult.warnings,
          hasAdId: parseResult.hasAdId,
        };

        // If Ad ID column exists, try to fetch Notion assets
        if (parseResult.hasAdId) {
          initialDebugInfo.notionStatus = 'loading';
          setDebugInfo(initialDebugInfo);
          setRawData(adsData);
          setFilters(defaultFilters);

          try {
            const notionResponse = await fetch('/api/notion/assets');

            if (notionResponse.ok) {
              const notionAssets: NotionAdAssets[] = await notionResponse.json();

              // Build a map for quick lookup
              const assetMap = new Map<string, NotionAdAssets['assets']>();
              for (const item of notionAssets) {
                const normalizedId = item.adId.trim();
                assetMap.set(normalizedId, item.assets);
              }

              // Merge assets into ads data
              let assetsLoaded = 0;
              adsData = adsData.map((ad) => {
                if (ad.adId) {
                  const assets = assetMap.get(ad.adId.trim());
                  if (assets && assets.length > 0) {
                    assetsLoaded++;
                    return { ...ad, assets };
                  }
                }
                return ad;
              });

              setRawData(adsData);
              setDebugInfo({
                ...initialDebugInfo,
                notionStatus: 'success',
                assetsLoaded,
              });
            } else {
              const errorData = await notionResponse.json().catch(() => ({}));
              setDebugInfo({
                ...initialDebugInfo,
                notionStatus: 'error',
                notionError: errorData.error || 'Failed to fetch Notion assets',
              });
            }
          } catch (notionErr) {
            setDebugInfo({
              ...initialDebugInfo,
              notionStatus: 'error',
              notionError: notionErr instanceof Error ? notionErr.message : 'Failed to connect to Notion',
            });
          }
        } else {
          // No Ad ID column
          setRawData(adsData);
          setFilters(defaultFilters);
          setDebugInfo({
            ...initialDebugInfo,
            notionStatus: 'no-adid',
          });
        }
      } else {
        const parseError = result as ParseError;
        setError(parseError.error);
        setRawData([]);
        setDebugInfo({
          detectedColumns: parseError.detectedColumns,
          suggestions: parseError.suggestions,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
      setRawData([]);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const handleReset = useCallback(() => {
    setFilters(defaultFilters);
    setSelectedAdIndex(null);
    updateUrlWithAdIndex(null);
  }, [updateUrlWithAdIndex]);

  // Filter and sort data
  const processedData = useMemo(() => {
    let result = [...rawData];

    // Filter by search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (ad) => ad.adName?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by active only
    if (filters.activeOnly) {
      result = result.filter(
        (ad) => ad.status?.toLowerCase() === 'active'
      );
    }

    // Filter by min spend
    if (filters.minSpend !== null) {
      result = result.filter(
        (ad) => ad.spend !== null && ad.spend >= filters.minSpend!
      );
    }

    // Sort
    result.sort((a, b) => {
      const getSortValue = (ad: AdData, key: SortOption): number => {
        switch (key) {
          case 'roas_desc':
            return ad.roas ?? -Infinity;
          case 'cpa_asc':
            return ad.cpa ?? Infinity;
          case 'spend_desc':
            return ad.spend ?? -Infinity;
          case 'purchases_desc':
            return ad.purchases ?? -Infinity;
          case 'impressions_desc':
            return ad.impressions ?? -Infinity;
          case 'frequency_asc':
            return ad.frequency ?? Infinity;
          default:
            return 0;
        }
      };

      const aVal = getSortValue(a, filters.sortBy);
      const bVal = getSortValue(b, filters.sortBy);

      // Ascending for CPA and Frequency, descending for others
      if (filters.sortBy === 'cpa_asc' || filters.sortBy === 'frequency_asc') {
        return aVal - bVal;
      }
      return bVal - aVal;
    });

    return result;
  }, [rawData, filters]);

  // Calculate top 5 performers by ROAS (indices in processedData)
  const topPerformerIds = useMemo(() => {
    const withRoas = processedData
      .map((ad, index) => ({ index, roas: ad.roas ?? -Infinity }))
      .filter((item) => item.roas !== -Infinity)
      .sort((a, b) => b.roas - a.roas)
      .slice(0, 5);

    return new Set(withRoas.map((item) => item.index));
  }, [processedData]);

  // Get selected ad from processedData
  const selectedAd = useMemo(() => {
    if (selectedAdIndex === null || selectedAdIndex >= processedData.length) {
      return null;
    }
    return {
      ad: processedData[selectedAdIndex],
      index: selectedAdIndex,
    };
  }, [selectedAdIndex, processedData]);

  const handleRowClick = useCallback(
    (_ad: AdData, index: number) => {
      setSelectedAdIndex(index);
      updateUrlWithAdIndex(index);
    },
    [updateUrlWithAdIndex]
  );

  const handleCloseDrawer = useCallback(() => {
    setSelectedAdIndex(null);
    updateUrlWithAdIndex(null);
  }, [updateUrlWithAdIndex]);

  const handleExport = useCallback(() => {
    exportToCSV(processedData, `meta-ads-export-${new Date().toISOString().split('T')[0]}.csv`);
  }, [processedData]);

  const handleMetaSync = useCallback(async () => {
    setIsSyncing(true);
    setError(null);

    try {
      let url: string;
      if (syncDateRange === 'custom' && syncCustomSince && syncCustomUntil) {
        url = `/api/meta/insights?since=${syncCustomSince}&until=${syncCustomUntil}`;
      } else {
        url = `/api/meta/insights?preset=${syncDateRange}`;
      }

      const res = await fetch(url);
      const json = await res.json();

      if (!res.ok) {
        const msg = json?.meta_error?.message ?? json?.error ?? 'Meta API error';
        setError(`Sync failed: ${msg}`);
        return;
      }

      const rows: MetaInsightRow[] = json.data ?? [];
      if (rows.length === 0) {
        setError('Sync returned no data for this date range.');
        return;
      }

      setRawData(normalizeMetaInsights(rows));
      setFilters(defaultFilters);
      setSelectedAdIndex(null);
      setDebugInfo(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync from Meta');
    } finally {
      setIsSyncing(false);
    }
  }, [syncDateRange, syncCustomSince, syncCustomUntil]);

  const hasWarnings = debugInfo?.warnings && debugInfo.warnings.length > 0;
  const isFiltered = !!(filters.search || filters.activeOnly || filters.minSpend !== null);

  // Icons rendered inside AdsTable's toolbar via headerRight prop
  const tableHeaderRight = (
    <div className="flex items-center gap-1">
      {/* Upload CSV icon button */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="p-1.5 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        title="Upload CSV / XLSX"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      </button>

      {/* Export CSV icon button */}
      {rawData.length > 0 && (
        <button
          onClick={handleExport}
          className="p-1.5 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          title="Export CSV"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
      )}

      {/* Debug info button */}
      {debugInfo && (
        <div className="relative" ref={debugRef}>
          <button
            onClick={() => setShowDebug(!showDebug)}
            className={`p-1.5 rounded-full transition-colors ${
              showDebug
                ? 'bg-gray-200 text-gray-700'
                : hasWarnings
                ? 'text-amber-500 hover:bg-amber-50'
                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
            }`}
            title="Parsing details"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {showDebug && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-4 text-sm">
              <h4 className="font-medium text-gray-900 mb-3">Parsing Details</h4>

              {/* Warnings */}
              {hasWarnings && (
                <div className="mb-3">
                  <div className="flex items-center gap-1.5 text-amber-700 mb-1.5">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-xs font-medium">Warnings</span>
                  </div>
                  <ul className="text-xs text-amber-800 space-y-0.5 pl-5">
                    {debugInfo.warnings?.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Mapped Columns */}
              {debugInfo.mappedColumns && Object.keys(debugInfo.mappedColumns).length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-medium text-gray-600 mb-1.5">
                    Mapped ({Object.keys(debugInfo.mappedColumns).length})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(debugInfo.mappedColumns).map(([field, column]) => (
                      <span
                        key={field}
                        className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded text-xs"
                        title={`${field} ← ${column}`}
                      >
                        {field}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Unmapped Columns */}
              {debugInfo.unmappedColumns && debugInfo.unmappedColumns.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-medium text-gray-600 mb-1.5">
                    Unmapped ({debugInfo.unmappedColumns.length})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {debugInfo.unmappedColumns.slice(0, 8).map((col) => (
                      <span
                        key={col}
                        className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-xs"
                      >
                        {col}
                      </span>
                    ))}
                    {debugInfo.unmappedColumns.length > 8 && (
                      <span className="text-xs text-gray-400">
                        +{debugInfo.unmappedColumns.length - 8} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Notion Integration Status */}
              <div className="border-t border-gray-100 pt-3 mt-3">
                <div className="text-xs font-medium text-gray-600 mb-1.5">
                  Creative Assets (Notion)
                </div>
                {debugInfo.notionStatus === 'loading' && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <div className="animate-spin h-3 w-3 border border-gray-400 border-t-transparent rounded-full"></div>
                    Loading from Notion...
                  </div>
                )}
                {debugInfo.notionStatus === 'success' && (
                  <span className="text-xs text-green-600">
                    {debugInfo.assetsLoaded} ads matched with creatives
                  </span>
                )}
                {debugInfo.notionStatus === 'error' && (
                  <span className="text-xs text-red-600" title={debugInfo.notionError}>
                    Failed to load: {debugInfo.notionError}
                  </span>
                )}
                {debugInfo.notionStatus === 'no-adid' && (
                  <span className="text-xs text-gray-500">
                    No Ad ID column found - creative join disabled
                  </span>
                )}
                {!debugInfo.notionStatus && (
                  <span className="text-xs text-gray-400">Not configured</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">Meta Ads Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Sync and analyze your Meta campaigns in one place.
        </p>
      </header>

      {/* Hidden file input — triggered by upload icon in AdsTable toolbar */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }}
        className="hidden"
      />

      {/* Top Bar with filters */}
      <TopBar
        filters={filters}
        onFiltersChange={setFilters}
        onMetaSync={handleMetaSync}
        isSyncing={isSyncing}
        syncDateRange={syncDateRange}
        onSyncDateRangeChange={setSyncDateRange}
        syncCustomSince={syncCustomSince}
        syncCustomUntil={syncCustomUntil}
        onSyncCustomSinceChange={setSyncCustomSince}
        onSyncCustomUntilChange={setSyncCustomUntil}
        onReset={handleReset}
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-sm text-gray-500">Parsing file...</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="m-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
                {debugInfo?.suggestions && debugInfo.suggestions.length > 0 && (
                  <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
                    {debugInfo.suggestions.map((suggestion, i) => (
                      <li key={i}>{suggestion}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        {!isLoading && !error && (
          <AdsTable
            data={processedData}
            topPerformerIds={topPerformerIds}
            onRowClick={handleRowClick}
            selectedIndex={selectedAd?.index ?? null}
            visibleCount={processedData.length}
            totalCount={rawData.length}
            isFiltered={isFiltered}
            headerRight={tableHeaderRight}
          />
        )}
      </main>

      {/* Details Drawer */}
      <DetailsDrawer
        ad={selectedAd?.ad ?? null}
        isTopPerformer={selectedAd ? topPerformerIds.has(selectedAd.index) : false}
        onClose={handleCloseDrawer}
      />
    </div>
  );
}
