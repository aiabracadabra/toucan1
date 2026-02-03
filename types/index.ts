export interface AdData {
  // Core fields (displayed in table)
  adName: string | null;
  impressions: number | null;
  spend: number | null;
  purchases: number | null;
  cpa: number | null;
  roas: number | null;
  frequency: number | null;
  adSet: string | null;
  status: string | null;

  // Creative fields (shown in drawer, hidden in table)
  headline: string | null;
  body: string | null;
  destinationLink: string | null;
  previewLink: string | null;
  imageHash: string | null;

  // Store original row for debugging
  raw: Record<string, unknown>;
}

export type SortOption =
  | 'roas_desc'
  | 'cpa_asc'
  | 'spend_desc'
  | 'purchases_desc'
  | 'impressions_desc'
  | 'frequency_asc';

export interface Filters {
  search: string;
  activeOnly: boolean;
  minSpend: number | null;
  sortBy: SortOption;
}

export interface ParseResult {
  success: true;
  data: AdData[];
  detectedColumns: string[];
  mappedColumns: Record<string, string>;
  unmappedColumns: string[];
  warnings: string[];
}

export interface ParseError {
  success: false;
  error: string;
  detectedColumns: string[];
  suggestions: string[];
}

export type ParseOutcome = ParseResult | ParseError;
