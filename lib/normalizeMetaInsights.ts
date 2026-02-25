import { AdData } from '@/types';

interface MetaAction {
  action_type: string;
  value: string;
}

export interface MetaInsightRow {
  ad_id?: string;
  ad_name?: string;
  adset_name?: string;
  campaign_name?: string;
  effective_status?: string;
  impressions?: string;
  reach?: string;
  frequency?: string;
  spend?: string;
  cpm?: string;
  actions?: MetaAction[];
  action_values?: MetaAction[];
  purchase_roas?: MetaAction[];
  [key: string]: unknown;
}

export function normalizeMetaInsights(rows: MetaInsightRow[]): AdData[] {
  return rows.map((row): AdData => {
    const spend = row.spend ? parseFloat(row.spend) || null : null;
    const impressions = row.impressions ? parseFloat(row.impressions) || null : null;
    const frequency = row.frequency ? parseFloat(row.frequency) || null : null;

    // Purchases from actions where action_type === "purchase"
    const purchaseAction = row.actions?.find((a) => a.action_type === 'purchase');
    const purchases = purchaseAction ? parseFloat(purchaseAction.value) || null : null;

    // CPA = spend / purchases
    const cpa =
      spend !== null && purchases !== null && purchases > 0
        ? spend / purchases
        : null;

    // ROAS: purchase_roas[0] → action_values purchase / spend → null
    let roas: number | null = null;
    if (row.purchase_roas && row.purchase_roas.length > 0) {
      roas = parseFloat(row.purchase_roas[0].value) || null;
    } else if (row.action_values && spend && spend > 0) {
      const pvEntry = row.action_values.find((a) => a.action_type === 'purchase');
      if (pvEntry) {
        const pv = parseFloat(pvEntry.value) || 0;
        roas = pv > 0 ? pv / spend : null;
      }
    }

    return {
      adId: row.ad_id?.trim() || null,
      adName: row.ad_name?.trim() || null,
      adSet: row.adset_name?.trim() || null,
      campaignName: row.campaign_name?.trim() || null,
      impressions,
      spend,
      frequency,
      purchases,
      cpa,
      roas,
      status: row.effective_status?.trim() || null,
      headline: null,
      body: null,
      destinationLink: null,
      previewLink: null,
      imageHash: null,
      assets: [],
      raw: row,
    };
  });
}
