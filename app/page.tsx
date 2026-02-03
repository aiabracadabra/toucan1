'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import TopBar from '@/components/TopBar';
import AdsTable from '@/components/AdsTable';
import DetailsDrawer from '@/components/DetailsDrawer';
import { parseFile } from '@/lib/parseFile';
import { exportToCSV } from '@/lib/exportCSV';
import { AdData, Filters, SortOption, ParseResult, ParseError } from '@/types';

const defaultFilters: Filters = {
  search: '',
  activeOnly: false,
  minSpend: null,
  sortBy: 'roas_desc',
};

interface ParseDebugInfo {
  detectedColumns: string[];
  mappedColumns?: Record<string, string>;
  unmappedColumns?: string[];
  warnings?: string[];
  suggestions?: string[];
}

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [rawData, setRawData] = useState<AdData[]>([]);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [selectedAdIndex, setSelectedAdIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<ParseDebugInfo | null>(null);
  const [showDebug, setShowDebug] = useState(false);

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
        setRawData(parseResult.data);
        setFilters(defaultFilters);
        setDebugInfo({
          detectedColumns: parseResult.detectedColumns,
          mappedColumns: parseResult.mappedColumns,
          unmappedColumns: parseResult.unmappedColumns,
          warnings: parseResult.warnings,
        });

        // Auto-show debug if there are warnings
        if (parseResult.warnings.length > 0) {
          setShowDebug(true);
        }
      } else {
        const parseError = result as ParseError;
        setError(parseError.error);
        setRawData([]);
        setDebugInfo({
          detectedColumns: parseError.detectedColumns,
          suggestions: parseError.suggestions,
        });
        setShowDebug(true); // Always show debug on error
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
    (ad: AdData, index: number) => {
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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">Meta Ads Dashboard Viewer</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload your exported Meta Ads report to analyze performance
        </p>
      </header>

      {/* Top Bar with filters */}
      <TopBar
        filters={filters}
        onFiltersChange={setFilters}
        onFileUpload={handleFileUpload}
        onReset={handleReset}
        onExport={handleExport}
        hasData={processedData.length > 0}
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

        {/* Debug Panel */}
        {debugInfo && !isLoading && (
          <div className="mx-4 mt-4">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <svg
                className={`w-4 h-4 transition-transform ${showDebug ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              {showDebug ? 'Hide' : 'Show'} parsing details
            </button>

            {showDebug && (
              <div className="mt-3 p-4 bg-gray-100 border border-gray-200 rounded-lg text-sm">
                {/* Warnings */}
                {debugInfo.warnings && debugInfo.warnings.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium text-amber-700 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Warnings
                    </h4>
                    <ul className="list-disc list-inside text-amber-800 space-y-1">
                      {debugInfo.warnings.map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Mapped Columns */}
                {debugInfo.mappedColumns && Object.keys(debugInfo.mappedColumns).length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium text-green-700 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Mapped Columns ({Object.keys(debugInfo.mappedColumns).length})
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.entries(debugInfo.mappedColumns).map(([field, column]) => (
                        <div key={field} className="bg-green-50 px-2 py-1 rounded text-xs">
                          <span className="font-mono text-green-800">{field}</span>
                          <span className="text-green-600"> ← </span>
                          <span className="text-green-700">{column}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Unmapped Columns */}
                {debugInfo.unmappedColumns && debugInfo.unmappedColumns.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-600 mb-2">
                      Unmapped Columns ({debugInfo.unmappedColumns.length})
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {debugInfo.unmappedColumns.map((col) => (
                        <span
                          key={col}
                          className="bg-gray-200 px-2 py-0.5 rounded text-xs text-gray-700"
                        >
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* All Detected Columns (for errors) */}
                {error && debugInfo.detectedColumns.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-600 mb-2">
                      Detected Columns ({debugInfo.detectedColumns.length})
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {debugInfo.detectedColumns.map((col) => (
                        <span
                          key={col}
                          className="bg-gray-200 px-2 py-0.5 rounded text-xs text-gray-700"
                        >
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {debugInfo.detectedColumns.length === 0 && (
                  <p className="text-gray-500 italic">No columns detected in the file.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Stats bar */}
        {!isLoading && rawData.length > 0 && (
          <div className="bg-white border-b border-gray-200 px-4 py-2 mt-4">
            <p className="text-sm text-gray-500">
              Showing <span className="font-medium text-gray-900">{processedData.length}</span> of{' '}
              <span className="font-medium text-gray-900">{rawData.length}</span> ads
              {filters.search || filters.activeOnly || filters.minSpend !== null
                ? ' (filtered)'
                : ''}
            </p>
          </div>
        )}

        {/* Table */}
        {!isLoading && !error && (
          <AdsTable
            data={processedData}
            topPerformerIds={topPerformerIds}
            onRowClick={handleRowClick}
            selectedIndex={selectedAd?.index ?? null}
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
