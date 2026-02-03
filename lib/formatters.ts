export function formatCurrency(value: number | null): string {
  if (value === null) return '-';
  return `$${value.toFixed(2)}`;
}

export function formatROAS(value: number | null): string {
  if (value === null) return '-';
  return `${value.toFixed(2)}x`;
}

export function formatInteger(value: number | null): string {
  if (value === null) return '-';
  return Math.round(value).toLocaleString('en-US');
}

export function formatDecimal(value: number | null, decimals: number = 2): string {
  if (value === null) return '-';
  return value.toFixed(decimals);
}

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
    // Attempt to create a URL object - this validates the URL format
    const url = new URL(value.trim());

    // Only allow http and https protocols
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { valid: false };
    }

    return { valid: true, url: url.href };
  } catch {
    // If URL constructor throws, the URL is invalid
    return { valid: false };
  }
}

/**
 * Truncates a URL for display, showing domain and partial path
 */
export function truncateUrl(url: string, maxLength: number = 40): string {
  if (url.length <= maxLength) return url;

  try {
    const parsed = new URL(url);
    const domain = parsed.hostname;
    const path = parsed.pathname;

    // Show domain + truncated path
    const domainPart = domain;
    const remainingLength = maxLength - domainPart.length - 3; // 3 for "..."

    if (remainingLength > 5 && path.length > 1) {
      return `${domainPart}${path.substring(0, remainingLength)}...`;
    }

    return `${domainPart}...`;
  } catch {
    // If parsing fails, just truncate the string
    return url.substring(0, maxLength - 3) + '...';
  }
}
