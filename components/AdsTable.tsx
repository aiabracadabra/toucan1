'use client';

import { AdData } from '@/types';
import {
  formatCurrency,
  formatROAS,
  formatInteger,
  formatDecimal,
  formatString,
} from '@/lib/formatters';

interface AdsTableProps {
  data: AdData[];
  topPerformerIds: Set<number>;
  onRowClick: (ad: AdData, index: number) => void;
  selectedIndex: number | null;
}

export default function AdsTable({
  data,
  topPerformerIds,
  onRowClick,
  selectedIndex,
}: AdsTableProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <svg
            className="w-12 h-12 mx-auto mb-4 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-lg font-medium">No ads to display</p>
          <p className="text-sm mt-1">Upload a CSV or XLSX file to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-auto flex-1">
      <table className="w-full border-collapse min-w-[1000px]">
        <thead className="sticky top-0 z-10">
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Ad Name
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Impressions
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Spend ($)
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Purchases
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
              CPA ($)
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
              ROAS
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Frequency
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Ad Set
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((ad, index) => {
            const isTopPerformer = topPerformerIds.has(index);
            const isSelected = selectedIndex === index;

            return (
              <tr
                key={index}
                onClick={() => onRowClick(ad, index)}
                className={`cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-blue-50'
                    : isTopPerformer
                    ? 'bg-green-50 hover:bg-green-100'
                    : 'hover:bg-gray-50'
                }`}
              >
                <td className="px-4 py-3 text-sm text-gray-900">
                  <div className="flex items-center gap-2">
                    <span className="truncate max-w-[200px]" title={formatString(ad.adName)}>
                      {formatString(ad.adName)}
                    </span>
                    {isTopPerformer && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                        Top
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 text-right font-mono">
                  {formatInteger(ad.impressions)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 text-right font-mono">
                  {formatCurrency(ad.spend)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 text-right font-mono">
                  {formatInteger(ad.purchases)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 text-right font-mono">
                  {formatCurrency(ad.cpa)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 text-right font-mono">
                  <span
                    className={
                      ad.roas !== null && ad.roas >= 3
                        ? 'text-green-600 font-medium'
                        : ad.roas !== null && ad.roas < 1
                        ? 'text-red-600'
                        : ''
                    }
                  >
                    {formatROAS(ad.roas)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 text-right font-mono">
                  {formatDecimal(ad.frequency)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  <span className="truncate max-w-[150px] block" title={formatString(ad.adSet)}>
                    {formatString(ad.adSet)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <StatusBadge status={ad.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) {
    return <span className="text-gray-400">-</span>;
  }

  const normalizedStatus = status.toLowerCase();
  let colorClasses = 'bg-gray-100 text-gray-700';

  if (normalizedStatus === 'active') {
    colorClasses = 'bg-green-100 text-green-700';
  } else if (normalizedStatus === 'paused') {
    colorClasses = 'bg-yellow-100 text-yellow-700';
  } else if (normalizedStatus === 'completed' || normalizedStatus === 'ended') {
    colorClasses = 'bg-gray-100 text-gray-700';
  } else if (normalizedStatus === 'error' || normalizedStatus === 'rejected') {
    colorClasses = 'bg-red-100 text-red-700';
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${colorClasses}`}
    >
      {status}
    </span>
  );
}
