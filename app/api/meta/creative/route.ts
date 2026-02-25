import { NextRequest, NextResponse } from 'next/server';

const GRAPH_API_VERSION = 'v19.0';
const GRAPH_API_BASE = 'https://graph.facebook.com';

export type VideoStatus =
  | 'ok'             // videoSource available
  | 'thumbnail_only' // video found, no streamable source but thumbnail available
  | 'not_accessible' // video_id found but neither source nor thumbnail
  | 'post_based'     // no video_id but effective_object_story_id exists
  | 'no_video';      // no video creative at all

export interface MetaCreativeResult {
  videoSource: string | null;
  thumbnailUrl: string | null;
  videoStatus: VideoStatus;
  fallbackMessage: string | null;
  // Text fields
  body: string | null;
  headline: string | null;
  destinationUrl: string | null;
  // Debug (always present; UI shows only in dev)
  videoId: string | null;
  extractionPath: 'a' | 'b' | 'c' | 'd' | null;
  rawCreative: unknown;
}

// ─── Video ID extraction ───────────────────────────────────────────────────

type ExtractionPath = 'a' | 'b' | 'c' | 'd';

function extractVideoId(creative: Record<string, unknown>): {
  videoId: string | null;
  path: ExtractionPath | null;
} {
  const spec = (creative.object_story_spec ?? {}) as Record<string, unknown>;
  const videoData = (spec.video_data ?? {}) as Record<string, unknown>;
  const linkData = (spec.link_data ?? {}) as Record<string, unknown>;
  const assetFeed = (creative.asset_feed_spec ?? {}) as Record<string, unknown>;

  // a) object_story_spec.video_data.video_id
  if (videoData.video_id) {
    return { videoId: String(videoData.video_id), path: 'a' };
  }

  // b) object_story_spec.link_data.video_id
  if (linkData.video_id) {
    return { videoId: String(linkData.video_id), path: 'b' };
  }

  // c) object_story_spec.link_data.child_attachments[*].video_id
  const attachments = linkData.child_attachments as Array<Record<string, unknown>> | undefined;
  if (attachments) {
    for (const att of attachments) {
      if (att.video_id) return { videoId: String(att.video_id), path: 'c' };
    }
  }

  // d) asset_feed_spec.videos[*].video_id | .id | plain string
  const videos = assetFeed.videos as Array<unknown> | undefined;
  if (videos) {
    for (const v of videos) {
      if (typeof v === 'string' && v) return { videoId: v, path: 'd' };
      if (v && typeof v === 'object') {
        const vo = v as Record<string, unknown>;
        const vid = vo.video_id ?? vo.id;
        if (vid) return { videoId: String(vid), path: 'd' };
      }
    }
  }

  return { videoId: null, path: null };
}

// ─── Text field extraction ─────────────────────────────────────────────────

function extractTextFields(creative: Record<string, unknown>): {
  body: string | null;
  headline: string | null;
  destinationUrl: string | null;
} {
  const spec = (creative.object_story_spec ?? {}) as Record<string, unknown>;
  const linkData = (spec.link_data ?? {}) as Record<string, unknown>;
  const videoData = (spec.video_data ?? {}) as Record<string, unknown>;
  const assetFeed = (creative.asset_feed_spec ?? {}) as Record<string, unknown>;

  type TextEntry = { text?: string };
  type UrlEntry = { website_url?: string };

  const body =
    (linkData.message as string | undefined)?.trim() ||
    (videoData.message as string | undefined)?.trim() ||
    (assetFeed.bodies as TextEntry[] | undefined)?.[0]?.text?.trim() ||
    null;

  const headline =
    (linkData.name as string | undefined)?.trim() ||
    (videoData.title as string | undefined)?.trim() ||
    (assetFeed.titles as TextEntry[] | undefined)?.[0]?.text?.trim() ||
    null;

  const destinationUrl =
    (linkData.link as string | undefined)?.trim() ||
    (assetFeed.link_urls as UrlEntry[] | undefined)?.[0]?.website_url?.trim() ||
    null;

  return {
    body: body || null,
    headline: headline || null,
    destinationUrl: destinationUrl || null,
  };
}

// ─── Creative thumbnail extraction ─────────────────────────────────────────
// Used as a fallback when no video source or video thumbnail is available.

function extractCreativeThumbnail(creative: Record<string, unknown>): string | null {
  // a) creative.thumbnail_url (Meta top-level field for the creative thumbnail)
  const thumbUrl = (creative.thumbnail_url as string | undefined)?.trim();
  if (thumbUrl) return thumbUrl;

  // b) creative.image_url (static image ads)
  const imageUrl = (creative.image_url as string | undefined)?.trim();
  if (imageUrl) return imageUrl;

  // c) asset_feed_spec.images[*].url
  const assetFeed = (creative.asset_feed_spec ?? {}) as Record<string, unknown>;
  const images = assetFeed.images as Array<Record<string, unknown>> | undefined;
  if (images) {
    for (const img of images) {
      const url = (img.url as string | undefined)?.trim();
      if (url) return url;
    }
  }

  return null;
}

// ─── Video thumbnail helpers ───────────────────────────────────────────────

interface ThumbnailEntry {
  uri?: string;
  width?: number;
  height?: number;
  is_preferred?: boolean;
}

function pickBestThumbnail(data: ThumbnailEntry[] | undefined | null): string | null {
  if (!data || data.length === 0) return null;
  const preferred = data.find((t) => t.is_preferred && t.uri);
  if (preferred?.uri) return preferred.uri;
  const sorted = [...data].filter((t) => t.uri).sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
  return sorted[0]?.uri ?? null;
}

// ─── Route handler ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const accessToken = process.env.META_ACCESS_TOKEN;

  if (!accessToken) {
    return NextResponse.json(
      { error: 'META_ACCESS_TOKEN is not configured' },
      { status: 500 }
    );
  }

  const adId = request.nextUrl.searchParams.get('adId');
  if (!adId) {
    return NextResponse.json(
      { error: 'adId query param is required' },
      { status: 400 }
    );
  }

  // Step 1 — fetch ad creative (including thumbnail_url and image_url for static/image ads)
  const adUrl = new URL(
    `/${GRAPH_API_VERSION}/${encodeURIComponent(adId)}`,
    GRAPH_API_BASE
  );
  adUrl.searchParams.set(
    'fields',
    'creative{id,thumbnail_url,image_url,object_story_spec,asset_feed_spec,effective_object_story_id}'
  );
  adUrl.searchParams.set('access_token', accessToken);

  const adRes = await fetch(adUrl.toString(), { cache: 'no-store' });
  const adJson = await adRes.json();

  if (!adRes.ok) {
    return NextResponse.json(
      { error: 'Meta API error', details: adJson?.error },
      { status: adRes.status }
    );
  }

  const creative = (adJson?.creative ?? {}) as Record<string, unknown>;
  const effectivePostId = creative.effective_object_story_id as string | undefined;
  const { videoId, path: extractionPath } = extractVideoId(creative);
  const { body, headline, destinationUrl } = extractTextFields(creative);
  const creativeThumbnail = extractCreativeThumbnail(creative);

  // e) No video_id but page post exists → use creative thumbnail if available
  if (!videoId && effectivePostId) {
    const result: MetaCreativeResult = {
      videoSource: null,
      thumbnailUrl: creativeThumbnail,
      videoStatus: 'post_based',
      fallbackMessage: null,
      body,
      headline,
      destinationUrl,
      videoId: null,
      extractionPath: null,
      rawCreative: creative,
    };
    return NextResponse.json(result);
  }

  // No video creative at all → use creative thumbnail if available (static image ad)
  if (!videoId) {
    const result: MetaCreativeResult = {
      videoSource: null,
      thumbnailUrl: creativeThumbnail,
      videoStatus: 'no_video',
      fallbackMessage: null,
      body,
      headline,
      destinationUrl,
      videoId: null,
      extractionPath: null,
      rawCreative: creative,
    };
    return NextResponse.json(result);
  }

  // Step 2 — fetch video source + thumbnail
  const videoUrl = new URL(
    `/${GRAPH_API_VERSION}/${encodeURIComponent(videoId)}`,
    GRAPH_API_BASE
  );
  videoUrl.searchParams.set('fields', 'source,thumbnails');
  videoUrl.searchParams.set('access_token', accessToken);

  const videoRes = await fetch(videoUrl.toString(), { cache: 'no-store' });
  const videoJson = videoRes.ok ? await videoRes.json() : null;

  const videoSource: string | null = videoJson?.source ?? null;
  let thumbnailUrl: string | null = pickBestThumbnail(videoJson?.thumbnails?.data);

  // Step 2b — if source is not accessible and we have no video thumbnail yet,
  // try a thumbnails-only request (some tokens can read thumbnails but not source)
  if (!videoSource && !thumbnailUrl) {
    const thumbUrl = new URL(
      `/${GRAPH_API_VERSION}/${encodeURIComponent(videoId)}`,
      GRAPH_API_BASE
    );
    thumbUrl.searchParams.set('fields', 'thumbnails');
    thumbUrl.searchParams.set('access_token', accessToken);

    const thumbRes = await fetch(thumbUrl.toString(), { cache: 'no-store' });
    if (thumbRes.ok) {
      const thumbJson = await thumbRes.json();
      thumbnailUrl = pickBestThumbnail(thumbJson?.thumbnails?.data);
    }
  }

  // Step 2c — fall back to creative-level thumbnail (thumbnail_url / image_url / asset images)
  if (!thumbnailUrl) {
    thumbnailUrl = creativeThumbnail;
  }

  let videoStatus: VideoStatus;
  let fallbackMessage: string | null = null;

  if (videoSource) {
    videoStatus = 'ok';
  } else if (thumbnailUrl) {
    videoStatus = 'thumbnail_only';
    fallbackMessage = 'Video preview only (restricted by Meta permissions)';
  } else {
    videoStatus = 'not_accessible';
    fallbackMessage = null;
  }

  const result: MetaCreativeResult = {
    videoSource,
    thumbnailUrl,
    videoStatus,
    fallbackMessage,
    body,
    headline,
    destinationUrl,
    videoId,
    extractionPath,
    rawCreative: creative,
  };
  return NextResponse.json(result);
}
