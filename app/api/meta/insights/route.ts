import { NextRequest, NextResponse } from 'next/server';

const GRAPH_API_VERSION = 'v19.0';
const GRAPH_API_BASE = 'https://graph.facebook.com';

// ─── Pagination helper ─────────────────────────────────────────────────────

type PagesResult =
  | { success: true; rows: unknown[] }
  | { success: false; status: number; error: unknown };

async function fetchAllPages(firstUrl: string): Promise<PagesResult> {
  const rows: unknown[] = [];
  let nextUrl: string | null = firstUrl;

  while (nextUrl) {
    const res: Response = await fetch(nextUrl, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    const json: Record<string, unknown> = await res.json();

    if (!res.ok) {
      return { success: false, status: res.status, error: json.error ?? json };
    }

    if (Array.isArray(json.data)) {
      rows.push(...json.data);
    }

    const paging = json.paging as { next?: string } | undefined;
    nextUrl = paging?.next ?? null;
  }

  return { success: true, rows };
}

// ─── Internal types ────────────────────────────────────────────────────────

interface AdRow {
  id: string;
  name?: string;
  effective_status?: string;
  adset?: { id?: string; name?: string };
  campaign?: { id?: string; name?: string };
}

interface ActionEntry {
  action_type: string;
  value: string;
}

interface InsightRow {
  ad_id?: string;
  ad_name?: string;
  adset_name?: string;
  campaign_name?: string;
  impressions?: string;
  reach?: string;
  frequency?: string;
  spend?: string;
  cpm?: string;
  actions?: ActionEntry[];
  action_values?: ActionEntry[];
  purchase_roas?: ActionEntry[];
}

// ─── Route handler ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const adAccountId = process.env.META_AD_ACCOUNT_ID;

  if (!accessToken) {
    return NextResponse.json(
      {
        error: 'META_ACCESS_TOKEN environment variable is not set',
        hint: 'Add META_ACCESS_TOKEN to your .env.local or Vercel project settings',
      },
      { status: 500 }
    );
  }

  if (!adAccountId) {
    return NextResponse.json(
      {
        error: 'META_AD_ACCOUNT_ID environment variable is not set',
        hint: 'Add META_AD_ACCOUNT_ID to your .env.local or Vercel project settings (e.g. act_123456789)',
      },
      { status: 500 }
    );
  }

  const { searchParams } = request.nextUrl;
  const preset = searchParams.get('preset') ?? 'last_30d';
  const since = searchParams.get('since');
  const until = searchParams.get('until');

  // Resolved label for logging
  const dateRangeLabel =
    since && until ? `${since} → ${until}` : `preset:${preset}`;

  try {
    // ── Step A: Fetch ALL ads (no date restriction) ───────────────────────────
    const adsUrl = new URL(`/${GRAPH_API_VERSION}/${adAccountId}/ads`, GRAPH_API_BASE);
    adsUrl.searchParams.set('fields', 'id,name,effective_status,adset{id,name},campaign{id,name}');
    adsUrl.searchParams.set('limit', '100');
    adsUrl.searchParams.set('access_token', accessToken);

    const adsResult = await fetchAllPages(adsUrl.toString());
    if (!adsResult.success) {
      return NextResponse.json(
        { error: 'Meta API error (ads)', meta_error: adsResult.error },
        { status: adsResult.status }
      );
    }
    const adRows = adsResult.rows as AdRow[];

    // ── Step B: Fetch ALL insights (paginated) ────────────────────────────────
    const insightsUrl = new URL(`/${GRAPH_API_VERSION}/${adAccountId}/insights`, GRAPH_API_BASE);
    insightsUrl.searchParams.set('level', 'ad');
    insightsUrl.searchParams.set(
      'fields',
      'ad_id,ad_name,adset_name,campaign_name,impressions,reach,frequency,spend,cpm,actions,action_values,purchase_roas'
    );
    insightsUrl.searchParams.set('limit', '500');
    insightsUrl.searchParams.set('access_token', accessToken);

    if (since && until) {
      insightsUrl.searchParams.set('time_range', JSON.stringify({ since, until }));
    } else {
      insightsUrl.searchParams.set('date_preset', preset);
    }

    if (process.env.NODE_ENV === 'development') {
      const logged = new URL(insightsUrl.toString());
      logged.searchParams.delete('access_token');
      console.log('[Meta sync] insights URL:', logged.toString());
    }

    const insightsResult = await fetchAllPages(insightsUrl.toString());
    if (!insightsResult.success) {
      return NextResponse.json(
        { error: 'Meta API error (insights)', meta_error: insightsResult.error },
        { status: insightsResult.status }
      );
    }
    const insightRows = insightsResult.rows as InsightRow[];

    // ── Step C: Merge ─────────────────────────────────────────────────────────
    // Ad lookup map: ad_id → AdRow
    const adMap = new Map<string, AdRow>();
    for (const ad of adRows) {
      if (ad.id) adMap.set(ad.id, ad);
    }

    const matchedAdIds = new Set<string>();
    const merged: Record<string, unknown>[] = [];

    // Insights are the source of truth for metrics; enrich with ad metadata
    for (const ins of insightRows) {
      const adId = ins.ad_id ?? '';
      if (adId) matchedAdIds.add(adId);
      const ad = adId ? adMap.get(adId) : undefined;

      merged.push({
        ad_id: adId,
        ad_name: ad?.name ?? ins.ad_name ?? null,
        adset_name: ad?.adset?.name ?? ins.adset_name ?? null,
        campaign_name: ad?.campaign?.name ?? ins.campaign_name ?? null,
        effective_status: ad?.effective_status ?? null,
        impressions: ins.impressions ?? '0',
        reach: ins.reach ?? '0',
        frequency: ins.frequency ?? '0',
        spend: ins.spend ?? '0',
        cpm: ins.cpm ?? null,
        actions: ins.actions ?? [],
        action_values: ins.action_values ?? [],
        purchase_roas: ins.purchase_roas ?? [],
      });
    }

    // Ads with no insight row → zero-metric rows (may still pass ACTIVE filter)
    for (const ad of adRows) {
      if (matchedAdIds.has(ad.id)) continue;
      merged.push({
        ad_id: ad.id,
        ad_name: ad.name ?? null,
        adset_name: ad.adset?.name ?? null,
        campaign_name: ad.campaign?.name ?? null,
        effective_status: ad.effective_status ?? null,
        impressions: '0',
        reach: '0',
        frequency: '0',
        spend: '0',
        cpm: null,
        actions: [],
        action_values: [],
        purchase_roas: [],
      });
    }

    // ── Step D: Deduplicate by ad_id (insight rows come first, so they win) ──
    const seenAdIds = new Set<string>();
    const deduped: Record<string, unknown>[] = [];
    for (const row of merged) {
      const adId = (row.ad_id as string) || '';
      if (!seenAdIds.has(adId)) {
        seenAdIds.add(adId);
        deduped.push(row);
      }
    }

    // ── Step E: Filter (after dedup, never before) ────────────────────────────
    const filtered = deduped.filter((row) => {
      const spend = parseFloat((row.spend as string | undefined) ?? '0') || 0;
      const status = ((row.effective_status as string | undefined) ?? '').toUpperCase();
      return spend > 0 || status === 'ACTIVE';
    });

    // ── Step F: Logging ───────────────────────────────────────────────────────
    console.log("Date range:", dateRangeLabel);
    console.log("Ads fetched:", adRows.length);
    console.log("Insights fetched:", insightRows.length);
    console.log("Unique insight ad_ids:", new Set(insightRows.map((r) => r.ad_id)).size);
    console.log("Merged (deduped by ad_id):", deduped.length);

    return NextResponse.json({ data: filtered });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch Meta data', details: message },
      { status: 500 }
    );
  }
}
