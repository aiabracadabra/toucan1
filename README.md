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

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **CSV Parsing**: PapaParse
- **XLSX Parsing**: SheetJS (xlsx)

## License

MIT
