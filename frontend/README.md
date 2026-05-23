# TTEG · Danapur Railway Station CCTV Surveillance Dashboard

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Add your assets to the `public/` folder:
   - `tteg.png` — company logo
   - `ptz.png` — PTZ Camera icon
   - `bullet.png` — Bullet Camera icon
   - `uhd.png` — UHD Camera icon
   - `dome.png` — Dome Camera icon

3. Start the dev server:
   ```bash
   npm run dev
   ```

4. Make sure your API is running at `http://localhost:5000/api/reports`

## API Format
The app expects GET `/api/reports` to return an array of report objects.
If the API is unavailable, the app falls back to mock data automatically.

## Features
- 4 separate tables: PTZ, Bullet, UHD, Dome cameras
- X-Series resources grouped at the bottom of each table with a visual divider
- Evidence photo modal with full details
- Interactive Leaflet map with color-coded markers
- Summary row per table (total, avg accuracy, X-series count, etc.)
- Dark surveillance-themed aesthetic
