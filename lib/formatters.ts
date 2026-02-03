/**
 * Formats a number in compact notation (K, M, B)
 */
function formatCompact(value: number, decimals: number = 1): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1_000_000_000) {
    return `${sign}${(absValue / 1_000_000_000).toFixed(decimals)}B`;
  }
  if (absValue >= 1_000_000) {
    return `${sign}${(absValue / 1_000_000).toFixed(decimals)}M`;
  }
  if (absValue >= 1_000) {
    return `${sign}${(absValue / 1_000).toFixed(decimals)}K`;
  }

  // For small numbers, show as-is (no decimals for integers)
  return `${sign}${absValue % 1 === 0 ? absValue.toString() : absValue.toFixed(decimals)}`;
}

/**
 * Formats currency in compact notation ($1.2K, $3.5M)
 */
export function formatCurrency(value: number | null): string {
  if (value === null) return '-';

  const absValue = Math.abs(value);

  if (absValue >= 1_000_000) {
    return `$${formatCompact(value, 1)}`.replace('$-', '-$');
  }
  if (absValue >= 1_000) {
    return `$${formatCompact(value, 1)}`.replace('$-', '-$');
  }
  if (absValue >= 100) {
    // $100-999: show whole dollars
    return `$${Math.round(value)}`;
  }
  if (absValue >= 10) {
    // $10-99: show one decimal
    return `$${value.toFixed(1)}`;
  }
  // Under $10: show two decimals
  return `$${value.toFixed(2)}`;
}

/**
 * Formats ROAS with 'x' suffix (2.5x)
 */
export function formatROAS(value: number | null): string {
  if (value === null) return '-';
  // ROAS is typically 0-10, so keep 2 decimals for precision
  return `${value.toFixed(2)}x`;
}

/**
 * Formats large integers in compact notation (8K, 1.2M)
 */
export function formatInteger(value: number | null): string {
  if (value === null) return '-';
  return formatCompact(Math.round(value), 1);
}

/**
 * Formats a decimal number
 */
export function formatDecimal(value: number | null, decimals: number = 2): string {
  if (value === null) return '-';
  return value.toFixed(decimals);
}

/**
 * Formats a string, returning '-' for null/empty
 */
export function formatString(value: string | null): string {
  return value || '-';
}

/**
 * Validates if a string is a valid URL
 * Returns { valid: true, url: string } if valid
 * Returns { valid: false } if invalid or empty
 */
export function validateUrl(value: string | null): { valid: true; url: string } | { valid: false } {
  if (!value || value.trim() === '') {
    return { valid: false };
  }

  try {
    const url = new URL(value.trim());

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { valid: false };
    }

    return { valid: true, url: url.href };
  } catch {
    return { valid: false };
  }
}

/**
 * Truncates a URL for display
 */
export function truncateUrl(url: string, maxLength: number = 40): string {
  if (url.length <= maxLength) return url;

  try {
    const parsed = new URL(url);
    const domain = parsed.hostname;
    const path = parsed.pathname;

    const domainPart = domain;
    const remainingLength = maxLength - domainPart.length - 3;

    if (remainingLength > 5 && path.length > 1) {
      return `${domainPart}${path.substring(0, remainingLength)}...`;
    }

    return `${domainPart}...`;
  } catch {
    return url.substring(0, maxLength - 3) + '...';
  }
}
