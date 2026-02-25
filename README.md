# Meta Ads Dashboard Viewer

A minimalist web application for viewing and analyzing exported Meta Ads reports. Upload your CSV or XLSX files and view your ads performance in a clean, sortable table with filtering capabilities.

## Features

- **File Upload**: Support for `.csv` and `.xlsx` files
- **Sortable Table**: Sort by ROAS, CPA, Spend, Purchases, Impressions, or Frequency
- **Filtering**: Search by ad name, filter active ads only, set minimum spend
- **Details View**: Click any row to see detailed ad information in a side panel
- **Top Performers**: Automatic highlighting of top 5 ads by ROAS
- **Export**: Export filtered/sorted data back to CSV
- **Responsive**: Clean, minimalist UI with sticky headers

## Supported Data Columns

The app recognizes these columns (case-insensitive, with common variations):

| Field | Recognized Column Names |
|-------|------------------------|
| Ad Name | `Ad Name`, `AdName`, `Name` |
| Impressions | `Impressions`, `Imps` |
| Spend ($) | `Spend`, `Spend ($)`, `Amount Spent`, `Cost` |
| Purchases | `Purchases`, `Purchase`, `Conversions` |
| CPA ($) | `CPA`, `CPA ($)`, `Cost Per Purchase`, `Cost Per Result` |
| ROAS | `ROAS`, `Return on Ad Spend`, `Purchase ROAS` |
| Frequency | `Frequency`, `Freq` |
| Ad Set | `Ad Set`, `AdSet`, `Ad Set Name` |
| Status | `Status`, `Delivery`, `Delivery Status` |

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
# Create production build
npm run build

# Start production server
npm start
```

## Usage

1. Click the **Upload File** button to select your Meta Ads export file (CSV or XLSX)
2. Use the search box to filter ads by name
3. Select a sort option from the dropdown (default: ROAS descending)
4. Toggle **Active only** to show only active ads
5. Set a **Min spend** value to filter out low-spend ads
6. Click any row to view detailed ad information in the side panel
7. Click **Export CSV** to download the current filtered/sorted view
8. Click **Reset filters** to clear all filters

## Sample Data Format

Your CSV/XLSX should have columns like:

```csv
Ad Name,Impressions,Spend ($),Purchases,CPA ($),ROAS,Frequency,Ad Set,Status
Summer Sale Ad 1,150000,2500.00,125,20.00,3.50,2.5,Summer Campaign,Active
Winter Promo,85000,1200.00,60,20.00,2.80,1.8,Winter Campaign,Paused
```

## Notion Integration (Creative Assets)

The app can fetch creative assets (images) from a Notion database and display them alongside your ad data. This requires:

1. Your Meta export includes an **Ad ID** column
2. A Notion database with matching Ad IDs and uploaded images

### Setting Up Notion Integration

#### 1. Create a Notion Integration

1. Go to [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **+ New integration**
3. Name it (e.g., "Meta Ads Dashboard")
4. Select the workspace where your database lives
5. Click **Submit**
6. Copy the **Internal Integration Token** (starts with `secret_...`)

#### 2. Set Up Your Notion Database

Your Notion database should have:

| Property Name | Property Type | Description |
|---------------|---------------|-------------|
| `Ad ID` | Text | The Meta Ad ID (must match exactly) |
| `Assets` | Files & media | Upload your creative images here |

You can also use these alternative property names:
- Ad ID: `Ad Id`, `ad id`, `AdID`, `adId`
- Assets: `assets`, `Creative`, `creative`, `Images`, `images`

#### 3. Share Database with Integration

1. Open your Notion database
2. Click **...** (three dots menu) in the top right
3. Go to **Connections** > **Add connections**
4. Search for and select your integration
5. Copy the **Database ID** from the URL:
   - URL format: `https://www.notion.so/yourworkspace/DATABASE_ID?v=...`
   - The Database ID is the 32-character string before the `?`

#### 4. Configure Environment Variables

For **local development**, create a `.env.local` file:

```bash
NOTION_TOKEN=secret_your_integration_token_here
NOTION_DATABASE_ID=your_database_id_here
```

For **Vercel deployment**:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** > **Environment Variables**
3. Add both variables:
   - `NOTION_TOKEN` = your integration token
   - `NOTION_DATABASE_ID` = your database ID
4. Redeploy for changes to take effect

### How It Works

1. Upload a Meta CSV/XLSX that includes an **Ad ID** column
2. The app automatically fetches assets from Notion via `/api/notion/assets`
3. Assets are matched to ads by Ad ID (string comparison, trimmed)
4. In the details drawer, you'll see:
   - Main creative image preview
   - Thumbnail navigation for multiple assets
   - "No creative uploaded yet" if no match found

### Troubleshooting

- **"NOTION_TOKEN environment variable is not set"**: Add the token to `.env.local` or Vercel settings
- **"Failed to fetch assets"**: Ensure the integration has access to the database
- **Assets not showing**: Verify Ad IDs match exactly (check for extra spaces)
- **"No Ad ID column found"**: Your CSV needs an "Ad ID" column for joining

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **CSV Parsing**: PapaParse
- **XLSX Parsing**: SheetJS (xlsx)
- **Notion API**: Server-side integration for creative assets

## License

MIT
