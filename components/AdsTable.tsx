'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
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

type ColumnKey =
  | 'purchases' | 'roas' | 'cpa' | 'spend' | 'impressions'
  | 'frequency' | 'cpm' | 'adSet' | 'campaignName' | 'status' | 'adId';

interface ColumnConfig {
  key: ColumnKey;
  label: string;
  defaultVisible: boolean;
}

const COLUMNS: ColumnConfig[] = [
  { key: 'purchases',    label: 'Purchases',       defaultVisible: true  },
  { key: 'roas',         label: 'ROAS',             defaultVisible: true  },
  { key: 'cpa',          label: 'CPA',              defaultVisible: true  },
  { key: 'spend',        label: 'Spend',            defaultVisible: true  },
  { key: 'impressions',  label: 'Impressions',      defaultVisible: true  },
  { key: 'frequency',    label: 'Frequency',        defaultVisible: true  },
  { key: 'cpm',          label: 'CPM',              defaultVisible: false },
  { key: 'adSet',        label: 'Ad Set Name',      defaultVisible: false },
  { key: 'campaignName', label: 'Campaign Name',    defaultVisible: false },
  { key: 'status',       label: 'Delivery Status',  defaultVisible: false },
  { key: 'adId',         label: 'Ad ID',            defaultVisible: false },
];

const DEFAULT_VISIBLE = new Set<ColumnKey>(
  COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key)
);

const TH = 'px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider';
const TD_NUM = 'px-4 py-3 text-sm font-normal text-gray-900 text-right tabular-nums';

export default function AdsTable({
  data,
  topPerformerIds,
  onRowClick,
  selectedIndex,
}: AdsTableProps) {
  const [userVisible, setUserVisible] = useState<Set<ColumnKey>>(DEFAULT_VISIBLE);
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    }
    if (showPicker) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showPicker]);

  // Which columns have actual data in the dataset
  const hasData = useMemo<Record<ColumnKey, boolean>>(() => {
    const check = (key: keyof AdData) => data.some((ad) => ad[key] !== null);
    const sp = check('spend');
    const im = check('impressions');
    return {
      purchases:    check('purchases'),
      roas:         check('roas'),
      cpa:          check('cpa'),
      spend:        sp,
      impressions:  im,
      frequency:    check('frequency'),
      cpm:          sp && im,
      adSet:        check('adSet'),
      campaignName: check('campaignName'),
      status:       check('status'),
      adId:         check('adId'),
    };
  }, [data]);

  // Final visibility = user preference AND column has data
  const vis = useMemo<Record<ColumnKey, boolean>>(() => {
    const result = {} as Record<ColumnKey, boolean>;
    for (const col of COLUMNS) {
      result[col.key] = userVisible.has(col.key) && hasData[col.key];
    }
    return result;
  }, [userVisible, hasData]);

  const toggleColumn = (key: ColumnKey) => {
    setUserVisible((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

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
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Columns toolbar */}
      <div className="flex justify-end px-4 py-2 border-b border-gray-100 bg-white shrink-0">
        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => setShowPicker((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            Columns
          </button>

          {showPicker && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
              {COLUMNS.map((col) => {
                const available = hasData[col.key];
                return (
                  <label
                    key={col.key}
                    className={`flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-gray-50 ${
                      !available ? 'opacity-40 cursor-not-allowed' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={userVisible.has(col.key)}
                      disabled={!available}
                      onChange={() => available && toggleColumn(col.key)}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{col.label}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto flex-1">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className={`${TH} text-left min-w-[200px]`}>Ad Name</th>
              {vis.purchases    && <th className={`${TH} text-right w-[80px]`}>Purch.</th>}
              {vis.roas         && <th className={`${TH} text-right w-[80px]`}>ROAS</th>}
              {vis.cpa          && <th className={`${TH} text-right w-[80px]`}>CPA</th>}
              {vis.spend        && <th className={`${TH} text-right w-[90px]`}>Spend</th>}
              {vis.impressions  && <th className={`${TH} text-right w-[100px]`}>Impr.</th>}
              {vis.frequency    && <th className={`${TH} text-right w-[70px]`}>Freq.</th>}
              {vis.cpm          && <th className={`${TH} text-right w-[80px]`}>CPM</th>}
              {vis.adSet        && <th className={`${TH} text-left min-w-[140px]`}>Ad Set</th>}
              {vis.campaignName && <th className={`${TH} text-left min-w-[140px]`}>Campaign</th>}
              {vis.status       && <th className={`${TH} text-left w-[90px]`}>Status</th>}
              {vis.adId         && <th className={`${TH} text-left w-[100px]`}>Ad ID</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((ad, index) => {
              const isTopPerformer = topPerformerIds.has(index);
              const isSelected = selectedIndex === index;

              const cpm =
                ad.spend !== null && ad.impressions !== null && ad.impressions > 0
                  ? (ad.spend / ad.impressions) * 1000
                  : null;

              const roasColor =
                ad.roas !== null && ad.roas > 2
                  ? 'text-[#16A34A]'
                  : ad.roas !== null && ad.roas < 1
                  ? 'text-[#DC2626]'
                  : 'text-gray-900';

              return (
                <tr
                  key={index}
                  onClick={() => onRowClick(ad, index)}
                  className={`cursor-pointer bg-white hover:bg-gray-100 transition-colors duration-200 ${
                    isSelected ? '!bg-gray-100' : ''
                  }`}
                >
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <span className="truncate max-w-[280px]" title={formatString(ad.adName)}>
                        {formatString(ad.adName)}
                      </span>
                      {isTopPerformer && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 flex-shrink-0">
                          Top
                        </span>
                      )}
                    </div>
                  </td>
                  {vis.purchases    && <td className={TD_NUM}>{formatInteger(ad.purchases)}</td>}
                  {vis.roas         && <td className={`${TD_NUM} ${roasColor}`}>{formatROAS(ad.roas)}</td>}
                  {vis.cpa          && <td className={TD_NUM}>{formatCurrency(ad.cpa)}</td>}
                  {vis.spend        && <td className={TD_NUM}>{formatCurrency(ad.spend)}</td>}
                  {vis.impressions  && <td className={TD_NUM}>{formatInteger(ad.impressions)}</td>}
                  {vis.frequency    && <td className={TD_NUM}>{formatDecimal(ad.frequency)}</td>}
                  {vis.cpm          && <td className={TD_NUM}>{formatCurrency(cpm)}</td>}
                  {vis.adSet && (
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <span className="truncate max-w-[160px] block" title={formatString(ad.adSet)}>
                        {formatString(ad.adSet)}
                      </span>
                    </td>
                  )}
                  {vis.campaignName && (
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <span className="truncate max-w-[160px] block" title={formatString(ad.campaignName)}>
                        {formatString(ad.campaignName)}
                      </span>
                    </td>
                  )}
                  {vis.status && (
                    <td className="px-4 py-3 text-sm">
                      <StatusBadge status={ad.status} />
                    </td>
                  )}
                  {vis.adId && (
                    <td className="px-4 py-3 text-xs text-gray-400 tabular-nums">
                      {ad.adId ?? '-'}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-gray-400">-</span>;

  const s = status.toLowerCase();
  const colors =
    s === 'active'                       ? 'bg-green-100 text-green-700' :
    s === 'paused'                       ? 'bg-yellow-100 text-yellow-700' :
    s === 'completed' || s === 'ended'   ? 'bg-gray-100 text-gray-500' :
    s === 'error'     || s === 'rejected'? 'bg-red-100 text-red-700' :
                                           'bg-gray-100 text-gray-600';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${colors}`}>
      {status}
    </span>
  );
}
