import { NextRequest, NextResponse } from 'next/server';
import { NotionAdAssets, NotionAsset } from '@/types';

// Notion API types
interface NotionFile {
  type: 'file' | 'external';
  name?: string;
  file?: { url: string; expiry_time?: string };
  external?: { url: string };
}

interface NotionRichText {
  plain_text: string;
}

interface NotionProperty {
  type: string;
  rich_text?: NotionRichText[];
  title?: NotionRichText[];
  files?: NotionFile[];
  number?: number | null;
}

interface NotionPage {
  id: string;
  properties: {
    [key: string]: NotionProperty;
  };
}

interface NotionQueryResponse {
  results: NotionPage[];
  has_more: boolean;
  next_cursor: string | null;
}

const NOTION_API_VERSION = '2022-06-28';
const NOTION_API_BASE = 'https://api.notion.com/v1';

/**
 * Extracts the database ID from a URL or returns as-is if already an ID
 */
function extractDatabaseId(input: string): string {
  // If it's a URL, extract the ID
  if (input.includes('notion.so')) {
    // URL format: https://www.notion.so/workspace/DATABASE_ID?v=...
    // or: https://www.notion.so/DATABASE_ID?v=...
    const match = input.match(/([a-f0-9]{32})/i);
    if (match) {
      return match[1];
    }
    // Try to extract from path (handles NAME-ID format)
    const pathMatch = input.match(/\/([^/?]+)\??/);
    if (pathMatch) {
      const lastPart = pathMatch[1];
      // Check if it ends with a 32-char hex ID
      const idMatch = lastPart.match(/([a-f0-9]{32})$/i);
      if (idMatch) {
        return idMatch[1];
      }
      // Handle format like "META-2ff307ed734080a9a100c8f77a261702"
      const dashMatch = lastPart.match(/-([a-f0-9]{32})$/i);
      if (dashMatch) {
        return dashMatch[1];
      }
    }
  }
  // Already an ID or unrecognized format
  return input.replace(/-/g, '');
}

/**
 * Extracts Ad ID from a Notion page
 * Supports rich_text, title, and number property types
 */
function extractAdId(page: NotionPage): string | null {
  // Try different property name variations
  const propertyNames = ['Ad ID', 'Ad Id', 'ad id', 'AdID', 'adId', 'AD ID'];

  for (const propName of propertyNames) {
    const prop = page.properties[propName];
    if (!prop) continue;

    // Handle rich_text type - join ALL text segments
    if (prop.type === 'rich_text' && prop.rich_text) {
      const text = prop.rich_text.map(t => t.plain_text).join('').trim();
      if (text) return text;
    }

    // Handle title type - join ALL text segments
    if (prop.type === 'title' && prop.title) {
      const text = prop.title.map(t => t.plain_text).join('').trim();
      if (text) return text;
    }

    // Handle number type
    if (prop.type === 'number' && prop.number !== null && prop.number !== undefined) {
      return String(prop.number).trim();
    }
  }

  return null;
}

/**
 * Gets property type info for debugging
 */
function getPropertyInfo(page: NotionPage, propName: string): { found: boolean; type?: string; value?: string } {
  const prop = page.properties[propName];
  if (!prop) return { found: false };

  let value: string | undefined;

  if (prop.type === 'rich_text' && prop.rich_text) {
    value = prop.rich_text.map(t => t.plain_text).join('');
  } else if (prop.type === 'title' && prop.title) {
    value = prop.title.map(t => t.plain_text).join('');
  } else if (prop.type === 'number') {
    value = prop.number !== null ? String(prop.number) : 'null';
  } else if (prop.type === 'files' && prop.files) {
    value = `${prop.files.length} files`;
  }

  return { found: true, type: prop.type, value };
}

/**
 * Extracts assets from a Notion page
 */
function extractAssets(page: NotionPage): NotionAsset[] {
  const propertyNames = ['Assets', 'assets', 'Creative', 'creative', 'Images', 'images', 'Media', 'media'];

  for (const propName of propertyNames) {
    const prop = page.properties[propName];
    if (!prop || prop.type !== 'files' || !prop.files) continue;

    const assets: NotionAsset[] = [];

    for (let i = 0; i < prop.files.length; i++) {
      const file = prop.files[i];

      if (file.type === 'external' && file.external?.url) {
        assets.push({
          name: file.name || `Asset ${i + 1}`,
          url: file.external.url,
          kind: 'external',
        });
      } else if (file.type === 'file' && file.file?.url) {
        assets.push({
          name: file.name || `Asset ${i + 1}`,
          url: file.file.url,
          kind: 'file',
        });
      }
    }

    if (assets.length > 0) {
      return assets;
    }
  }

  return [];
}

/**
 * Fetches all pages from a Notion database with pagination
 */
async function fetchAllNotionPages(
  databaseId: string,
  token: string
): Promise<NotionPage[]> {
  const allPages: NotionPage[] = [];
  let cursor: string | null = null;
  let hasMore = true;

  while (hasMore) {
    const body: { page_size: number; start_cursor?: string } = {
      page_size: 100,
    };
    if (cursor) {
      body.start_cursor = cursor;
    }

    const response = await fetch(
      `${NOTION_API_BASE}/databases/${databaseId}/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Notion-Version': NOTION_API_VERSION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Notion API error (${response.status}): ${errorText}`);
    }

    const data: NotionQueryResponse = await response.json();
    allPages.push(...data.results);

    hasMore = data.has_more;
    cursor = data.next_cursor;
  }

  return allPages;
}

export async function GET(request: NextRequest) {
  // Check for debug mode
  const debugMode = request.nextUrl.searchParams.get('debug') === '1';

  // Validate environment variables
  const notionToken = process.env.NOTION_TOKEN;
  const rawDatabaseId = process.env.NOTION_DATABASE_ID;

  if (!notionToken) {
    return NextResponse.json(
      {
        error: 'NOTION_TOKEN environment variable is not set',
        hint: 'Add NOTION_TOKEN to your Vercel project settings or .env.local file',
      },
      { status: 500 }
    );
  }

  if (!rawDatabaseId) {
    return NextResponse.json(
      {
        error: 'NOTION_DATABASE_ID environment variable is not set',
        hint: 'Add NOTION_DATABASE_ID to your Vercel project settings or .env.local file',
      },
      { status: 500 }
    );
  }

  // Extract database ID from URL if needed
  const databaseId = extractDatabaseId(rawDatabaseId);

  try {
    // Fetch all pages from Notion
    const pages = await fetchAllNotionPages(databaseId, notionToken);

    // Debug mode: return diagnostic info
    if (debugMode) {
      const firstPage = pages[0];
      const propertyKeys = firstPage ? Object.keys(firstPage.properties) : [];

      const adIdInfo = firstPage ? getPropertyInfo(firstPage, 'Ad ID') : { found: false };
      const assetsInfo = firstPage ? getPropertyInfo(firstPage, 'Assets') : { found: false };

      const sampleExtractions = pages.slice(0, 5).map(page => ({
        pageId: page.id,
        adId: extractAdId(page),
        assetsCount: extractAssets(page).length,
      }));

      return NextResponse.json({
        debug: true,
        databaseIdUsed: databaseId,
        resultsCount: pages.length,
        propertyKeys,
        adIdProperty: adIdInfo,
        assetsProperty: assetsInfo,
        sampleExtractions,
      });
    }

    // Extract Ad ID and assets from each page
    const results: NotionAdAssets[] = [];

    for (const page of pages) {
      const adId = extractAdId(page);
      if (!adId) continue; // Skip pages without Ad ID

      const assets = extractAssets(page);

      results.push({
        adId,
        assets,
      });
    }

    // Return with caching headers
    return NextResponse.json(results, {
      headers: {
        'Cache-Control': 's-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Failed to fetch Notion assets:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to fetch assets from Notion',
        details: errorMessage,
        databaseIdUsed: databaseId,
      },
      { status: 500 }
    );
  }
}
