'use client';

import { useRef } from 'react';
import { Filters, SortOption } from '@/types';

interface TopBarProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  onFileUpload: (file: File) => void;
  onReset: () => void;
  onExport: () => void;
  hasData: boolean;
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'roas_desc', label: 'ROAS (High to Low)' },
  { value: 'cpa_asc', label: 'CPA (Low to High)' },
  { value: 'spend_desc', label: 'Spend (High to Low)' },
  { value: 'purchases_desc', label: 'Purchases (High to Low)' },
  { value: 'impressions_desc', label: 'Impressions (High to Low)' },
  { value: 'frequency_asc', label: 'Frequency (Low to High)' },
];

export default function TopBar({
  filters,
  onFiltersChange,
  onFileUpload,
  onReset,
  onExport,
  hasData,
}: TopBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
    // Reset input so the same file can be uploaded again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-20">
      <div className="flex flex-wrap items-center gap-3">
        {/* Upload Button */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={handleUploadClick}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            Upload File
          </button>
        </div>

        {/* Search Input */}
        <div className="flex-1 min-w-[200px] max-w-xs">
          <input
            type="text"
            placeholder="Search by Ad Name..."
            value={filters.search}
            onChange={(e) =>
              onFiltersChange({ ...filters, search: e.target.value })
            }
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        {/* Sort Dropdown */}
        <select
          value={filters.sortBy}
          onChange={(e) =>
            onFiltersChange({ ...filters, sortBy: e.target.value as SortOption })
          }
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Active Only Toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.activeOnly}
            onChange={(e) =>
              onFiltersChange({ ...filters, activeOnly: e.target.checked })
            }
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Active only</span>
        </label>

        {/* Min Spend Input */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-700">Min spend:</label>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="$0"
            value={filters.minSpend ?? ''}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                minSpend: e.target.value ? parseFloat(e.target.value) : null,
              })
            }
            className="w-24 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        {/* Reset Button */}
        <button
          onClick={onReset}
          className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Reset filters
        </button>

        {/* Export Button */}
        {hasData && (
          <button
            onClick={onExport}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Export CSV
          </button>
        )}
      </div>
    </div>
  );
}
