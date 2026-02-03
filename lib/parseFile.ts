import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { AdData, ParseOutcome } from '@/types';

// ============================================================================
// COLUMN MAPPING CONFIGURATION
// ============================================================================

type SchemaField = keyof Omit<AdData, 'raw'>;

// Each schema field maps to an array of possible column name variations
// Order matters: first match wins
const COLUMN_MAPPINGS: Record<SchemaField, string[]> = {
  adName: [
    'ad name',
    'adname',
    'ad_name',
    'name',
  ],
  status: [
    'ad delivery',
    'delivery status',
    'delivery',
    'status',
  ],
  adSet: [
    'ad set name',
    'adset name',
    'ad set',
    'adset',
    'ad_set',
  ],
  spend: [
    'amount spent (usd)',
    'amount spent usd',
    'amount spent',
    'spend ($)',
    'spend',
    'cost',
  ],
  impressions: [
    'impressions',
    'imps',
  ],
  purchases: [
    'purchases',
    'purchase',
    'conversions',
  ],
  cpa: [
    'cost per result',
    'cost per results',
    'cpa ($)',
    'cpa',
    'cost per purchase',
    'cost per action',
  ],
  roas: [
    'purchase roas (return on ad spend)',
    'purchase roas return on ad spend',
    'purchase roas',
    'return on ad spend',
    'roas',
  ],
  frequency: [
    'frequency',
    'freq',
  ],
  previewLink: [
    'preview link',
    'preview url',
    'preview',
    'ad preview',
    'ad preview link',
  ],
  destinationLink: [
    'link (ad settings)',
    'link ad settings',
    'destination url',
    'destination',
    'website url',
    'url',
    'landing page url',
    'landing page',
  ],
  body: [
    'body (ad settings)',
    'body ad settings',
    'body',
    'ad body',
    'message',
    'ad text',
    'text',
    'description',
    'ad description',
  ],
  headline: [
    'headline',
    'ad headline',
    'title',
    'ad title',
    'primary text',
  ],
  imageHash: [
    'image hash',
    'imagehash',
    'image_hash',
    'creative hash',
  ],
};

// Special column for Results fallback logic
const RESULTS_COLUMN_NAMES = ['results', 'result'];
const RESULT_TYPE_COLUMN_NAMES = ['result type', 'result indicator', 'result_type'];

// Fields that should be parsed as strings
const STRING_FIELDS: SchemaField[] = [
  'adName',
  'adSet',
  'status',
  'headline',
  'body',
  'destinationLink',
  'previewLink',
  'imageHash',
];

// ============================================================================
// HEADER NORMALIZATION
// ============================================================================

/**
 * Normalizes a column header for matching:
 * - Trims whitespace
 * - Converts to lowercase
 * - Collapses multiple spaces
 * - Removes parentheses and their content optionally preserved
 * - Removes special characters except spaces
 */
export function normalizeHeader(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Replace parentheses content but keep the text inside
    .replace(/\(([^)]+)\)/g, '$1')
    // Remove remaining special characters except spaces and alphanumerics
    .replace(/[^a-z0-9\s]/g, '')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}

// ============================================================================
// COLUMN DETECTION
// ============================================================================

interface ColumnMapping {
  originalName: string;
  normalizedName: string;
  schemaField: SchemaField | null;
}

interface DetectionResult {
  mappings: ColumnMapping[];
  mappedColumns: Record<string, string>; // schemaField -> originalColumnName
  unmappedColumns: string[];
  resultsColumn: string | null;
  resultTypeColumn: string | null;
  hasPurchasesColumn: boolean;
}

function detectColumns(headers: string[]): DetectionResult {
  const mappings: ColumnMapping[] = [];
  const mappedColumns: Record<string, string> = {};
  const unmappedColumns: string[] = [];
  let resultsColumn: string | null = null;
  let resultTypeColumn: string | null = null;
  let hasPurchasesColumn = false;

  // Track which schema fields have been mapped to avoid duplicates
  const usedFields = new Set<SchemaField>();

  for (const header of headers) {
    const normalized = normalizeHeader(header);
    let matchedField: SchemaField | null = null;

    // Check for Results column (special handling)
    if (RESULTS_COLUMN_NAMES.includes(normalized)) {
      resultsColumn = header;
    }

    // Check for Result Type column
    if (RESULT_TYPE_COLUMN_NAMES.some(rt => normalized.includes(normalizeHeader(rt)))) {
      resultTypeColumn = header;
    }

    // Try to match against schema fields
    for (const [field, variations] of Object.entries(COLUMN_MAPPINGS) as [SchemaField, string[]][]) {
      if (usedFields.has(field)) continue;

      for (const variation of variations) {
        const normalizedVariation = normalizeHeader(variation);
        if (normalized === normalizedVariation || normalized.includes(normalizedVariation)) {
          matchedField = field;
          usedFields.add(field);
          mappedColumns[field] = header;

          if (field === 'purchases') {
            hasPurchasesColumn = true;
          }
          break;
        }
      }
      if (matchedField) break;
    }

    mappings.push({
      originalName: header,
      normalizedName: normalized,
      schemaField: matchedField,
    });

    if (!matchedField && !RESULTS_COLUMN_NAMES.includes(normalized)) {
      unmappedColumns.push(header);
    }
  }

  return {
    mappings,
    mappedColumns,
    unmappedColumns,
    resultsColumn,
    resultTypeColumn,
    hasPurchasesColumn,
  };
}

// ============================================================================
// VALUE PARSING
// ============================================================================

/**
 * Safely parses a numeric value, handling:
 * - Currency symbols ($, €, etc.)
 * - Commas as thousand separators
 * - Percentage signs
 * - 'x' suffix (for ROAS like "3.5x")
 * - Empty strings, dashes, NaN
 */
function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return isNaN(value) || !isFinite(value) ? null : value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    // Handle empty or placeholder values
    if (trimmed === '' || trimmed === '-' || trimmed === 'N/A' || trimmed === 'n/a') {
      return null;
    }

    // Remove currency symbols, commas, percentage signs, 'x' suffix
    const cleaned = trimmed
      .replace(/[$€£¥,]/g, '')
      .replace(/x$/i, '')
      .replace(/%$/, '')
      .trim();

    if (cleaned === '' || cleaned === '-') {
      return null;
    }

    const num = parseFloat(cleaned);
    return isNaN(num) || !isFinite(num) ? null : num;
  }

  return null;
}

/**
 * Safely parses a string value
 */
function parseString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const str = String(value).trim();
  return str === '' || str === '-' || str === 'N/A' ? null : str;
}

// ============================================================================
// ROW MAPPING
// ============================================================================

interface RowMappingContext {
  detection: DetectionResult;
  warnings: string[];
  useResultsAsPurchases: boolean;
}

/**
 * Maps a raw row object to our schema
 */
export function mapRowToSchema(
  row: Record<string, unknown>,
  context: RowMappingContext
): AdData {
  const { detection, useResultsAsPurchases } = context;
  const { mappedColumns, resultsColumn } = detection;

  const getValue = (field: SchemaField): unknown => {
    const columnName = mappedColumns[field];
    return columnName ? row[columnName] : undefined;
  };

  // Parse purchases with Results fallback
  let purchases: number | null = null;
  if (mappedColumns['purchases']) {
    purchases = parseNumber(getValue('purchases'));
  } else if (useResultsAsPurchases && resultsColumn) {
    purchases = parseNumber(row[resultsColumn]);
  }

  const ad: AdData = {
    adName: parseString(getValue('adName')),
    impressions: parseNumber(getValue('impressions')),
    spend: parseNumber(getValue('spend')),
    purchases,
    cpa: parseNumber(getValue('cpa')),
    roas: parseNumber(getValue('roas')),
    frequency: parseNumber(getValue('frequency')),
    adSet: parseString(getValue('adSet')),
    status: parseString(getValue('status')),
    headline: parseString(getValue('headline')),
    body: parseString(getValue('body')),
    destinationLink: parseString(getValue('destinationLink')),
    previewLink: parseString(getValue('previewLink')),
    imageHash: parseString(getValue('imageHash')),
    raw: { ...row },
  };

  return ad;
}

// ============================================================================
// RESULT TYPE CHECKING
// ============================================================================

/**
 * Checks if the Results column should be used as Purchases
 * by examining the Result Type column
 */
function shouldUseResultsAsPurchases(
  data: Record<string, unknown>[],
  resultTypeColumn: string | null
): boolean {
  if (!resultTypeColumn || data.length === 0) {
    return false;
  }

  // Check first few rows to see if result type indicates purchases
  const samplesToCheck = Math.min(data.length, 10);

  for (let i = 0; i < samplesToCheck; i++) {
    const resultType = data[i][resultTypeColumn];
    if (resultType && typeof resultType === 'string') {
      const lower = resultType.toLowerCase();
      if (
        lower.includes('purchase') ||
        lower.includes('conversion') ||
        lower.includes('sale')
      ) {
        return true;
      }
    }
  }

  return false;
}

// ============================================================================
// VALIDATION
// ============================================================================

interface ValidationResult {
  isValid: boolean;
  error?: string;
  suggestions?: string[];
}

function validateMapping(detection: DetectionResult): ValidationResult {
  const { mappedColumns } = detection;

  // Check for required columns: adName AND (spend OR impressions)
  const hasAdName = !!mappedColumns['adName'];
  const hasSpend = !!mappedColumns['spend'];
  const hasImpressions = !!mappedColumns['impressions'];

  if (!hasAdName) {
    return {
      isValid: false,
      error: "We couldn't find an 'Ad Name' column in your file.",
      suggestions: [
        "Make sure your export includes the 'Ad name' or 'Ad Name' column.",
        "Export at the Ad level from Meta Ads Manager.",
      ],
    };
  }

  if (!hasSpend && !hasImpressions) {
    return {
      isValid: false,
      error: "We couldn't find spend or impressions data in your file.",
      suggestions: [
        "Make sure your export includes 'Amount spent' or 'Impressions' columns.",
        "In Meta Ads Manager, customize columns to include these metrics.",
      ],
    };
  }

  return { isValid: true };
}

// ============================================================================
// CSV PARSING
// ============================================================================

export async function parseCSV(file: File): Promise<ParseOutcome> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          console.warn('CSV parsing warnings:', results.errors);
        }

        const data = results.data as Record<string, unknown>[];
        if (data.length === 0) {
          resolve({
            success: false,
            error: 'The file appears to be empty or has no data rows.',
            detectedColumns: [],
            suggestions: ['Make sure your file contains data below the header row.'],
          });
          return;
        }

        const headers = Object.keys(data[0]);
        resolve(processData(data, headers));
      },
      error: (error) => {
        resolve({
          success: false,
          error: `Failed to parse CSV: ${error.message}`,
          detectedColumns: [],
          suggestions: ['Make sure the file is a valid CSV format.'],
        });
      },
    });
  });
}

// ============================================================================
// XLSX PARSING
// ============================================================================

export async function parseXLSX(file: File): Promise<ParseOutcome> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        if (workbook.SheetNames.length === 0) {
          resolve({
            success: false,
            error: 'The Excel file has no sheets.',
            detectedColumns: [],
            suggestions: ['Make sure your Excel file contains at least one sheet with data.'],
          });
          return;
        }

        // Use first sheet by default
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];

        if (jsonData.length === 0) {
          resolve({
            success: false,
            error: 'The sheet appears to be empty or has no data rows.',
            detectedColumns: [],
            suggestions: ['Make sure your sheet contains data below the header row.'],
          });
          return;
        }

        const headers = Object.keys(jsonData[0]);
        resolve(processData(jsonData, headers));
      } catch (error) {
        resolve({
          success: false,
          error: `Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`,
          detectedColumns: [],
          suggestions: ['Make sure the file is a valid .xlsx or .xls format.'],
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        error: 'Failed to read the file.',
        detectedColumns: [],
        suggestions: ['Try uploading the file again.'],
      });
    };

    reader.readAsBinaryString(file);
  });
}

// ============================================================================
// MAIN PROCESSING
// ============================================================================

function processData(
  data: Record<string, unknown>[],
  headers: string[]
): ParseOutcome {
  const warnings: string[] = [];

  // Detect and map columns
  const detection = detectColumns(headers);

  // Validate required columns
  const validation = validateMapping(detection);
  if (!validation.isValid) {
    return {
      success: false,
      error: validation.error!,
      detectedColumns: headers,
      suggestions: validation.suggestions || [],
    };
  }

  // Check if we should use Results as Purchases
  const useResultsAsPurchases =
    !detection.hasPurchasesColumn &&
    detection.resultsColumn !== null &&
    shouldUseResultsAsPurchases(data, detection.resultTypeColumn);

  if (useResultsAsPurchases) {
    warnings.push(
      'Using "Results" column as Purchases (detected purchase-type results).'
    );
  } else if (!detection.hasPurchasesColumn && detection.resultsColumn) {
    warnings.push(
      'Results column found but not used as Purchases (result type is not purchase-related).'
    );
  }

  // Map all rows
  const context: RowMappingContext = {
    detection,
    warnings,
    useResultsAsPurchases,
  };

  const ads = data.map((row) => mapRowToSchema(row, context));

  // Add warnings for missing important columns
  if (!detection.mappedColumns['roas']) {
    warnings.push('ROAS column not found. ROAS values will be empty.');
  }
  if (!detection.mappedColumns['cpa']) {
    warnings.push('CPA column not found. CPA values will be empty.');
  }

  return {
    success: true,
    data: ads,
    detectedColumns: headers,
    mappedColumns: detection.mappedColumns,
    unmappedColumns: detection.unmappedColumns,
    warnings,
  };
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

export async function parseFile(file: File): Promise<ParseOutcome> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'csv') {
    return parseCSV(file);
  } else if (extension === 'xlsx' || extension === 'xls') {
    return parseXLSX(file);
  } else {
    return {
      success: false,
      error: 'Unsupported file format.',
      detectedColumns: [],
      suggestions: [
        'Please upload a CSV or Excel (.xlsx, .xls) file.',
        'You can export these formats from Meta Ads Manager.',
      ],
    };
  }
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

export { COLUMN_MAPPINGS, STRING_FIELDS };
