import { AdData } from '@/types';

export function exportToCSV(data: AdData[], filename: string = 'meta-ads-export.csv'): void {
  const headers = [
    'Ad Name',
    'Impressions',
    'Spend ($)',
    'Purchases',
    'CPA ($)',
    'ROAS',
    'Frequency',
    'Ad Set',
    'Status',
    'Headline',
    'Body',
    'Destination Link',
    'Preview Link',
    'Image Hash'
  ];

  const rows = data.map(ad => [
    ad.adName ?? '',
    ad.impressions ?? '',
    ad.spend ?? '',
    ad.purchases ?? '',
    ad.cpa ?? '',
    ad.roas ?? '',
    ad.frequency ?? '',
    ad.adSet ?? '',
    ad.status ?? '',
    ad.headline ?? '',
    ad.body ?? '',
    ad.destinationLink ?? '',
    ad.previewLink ?? '',
    ad.imageHash ?? ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row =>
      row.map(cell => {
        // Escape cells that contain commas or quotes
        const str = String(cell);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
