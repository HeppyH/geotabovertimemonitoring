# Geotab Overtime Monitoring — MyGeotab Add-In

Production-ready MyGeotab Add-In for monitoring vehicle after-hours driving activity. Uses native `Trip.afterHoursDrivingDuration` calculated from vehicle WorkTime schedules.

## Architecture

- **Frontend**: React 19 + TypeScript + Vite
- **Data Layer**: TanStack Query v5 with typed MyGeotab API client
- **State**: AddInData for preferences (cloud + localStorage fallback)
- **No external database or backend** — MyGeotab is the sole data source

## Key Features

- Dashboard metrics: total after-hours hours, vehicles with after-hours activity, unassigned driver trips
- Vehicle Monitoring table: per-vehicle after-hours driving with status pills (Normal/Warning/Critical)
- Trip Details table: individual trips with driving/idling/after-hours breakdown
- Settings: monitoring period, grace period, minimum overtime, warning/critical thresholds, timezone, week start
- CSV export for current filtered view
- Responsive loading/error/empty states

## Local Development

```bash
npm install
npm run dev
```

Open the local Vite URL (http://localhost:5173/geotabovertimemonitoring/). Runs in **standalone preview mode** — shows "Demo preview" notice since MyGeotab runtime is not present.

## Production Build

```bash
npm run build
```

Output in `dist/` with correct base path (`/geotabovertimemonitoring/`). Includes `manifest.json` for MyGeotab registration.

## MyGeotab Add-In Registration

### 1. Host the Application

Deploy `dist/` to any HTTPS static hosting. GitHub Pages is configured via `.github/workflows/deploy.yml` (push to `main` branch).

After deployment, your app URL will be:
```
https://<YOUR_GITHUB_USERNAME>.github.io/geotabovertimemonitoring/
```

### 2. Update Manifest

Edit `public/manifest.json` and replace the `url` field with your actual hosted URL:

```json
{
  "url": "https://<YOUR_GITHUB_USERNAME>.github.io/geotabovertimemonitoring/"
}
```

Rebuild: `npm run build`

### 3. Register in MyGeotab

1. Open MyGeotab Administration → System → System Settings → Add-Ins
2. Click **Add Add-In**
3. Upload `dist/manifest.json` (or paste JSON content)
4. Save

### 4. Assign Security Clearance

1. Administration → Users → Security Clearances
2. Create or edit a clearance (e.g., "View After-Hours Monitoring")
3. Under **Add-Ins**, enable the clearance for "After-Hours Driving Monitoring"
4. Assign clearance to users/groups

### 5. Configure Vehicle WorkTime

After-hours calculation depends on vehicle WorkTime schedules:

1. Administration → Vehicles → select vehicle → **Work Time**
2. Assign a WorkTime schedule (or create one: Administration → Rules & Groups → Work Time)
3. Ensure `timeZoneId` is set on each Device

## Manifest Fields Reference

| Field | Value | Notes |
|-------|-------|-------|
| `namespace` | `geotab.addin.overtimeMonitoring` | Must match `ADDIN_NAMESPACE` in `src/geotab/addin.ts` |
| `path` | `/geotabovertimemonitoring/` | Must match Vite `base` config |
| `url` | Your HTTPS hosting URL | Update after deployment |
| `enableViewSecurityId` | `true` | Enables security clearance gating |
| `manifestVersion` | `1` | MyGeotab manifest version |

## Live Testing Checklist

### Add-In Loading
- [ ] Add-In appears in MyGeotab menu (ActivityLink)
- [ ] No console errors on load
- [ ] Connection indicator shows "Connected to MyGeotab (database)"

### Data Retrieval
- [ ] Vehicles load (Device API)
- [ ] Drivers load (User API with `isDriver: true`)
- [ ] Trips load for selected period (Trip API with date filters)
- [ ] Pagination works for large trip datasets

### After-Hours Calculation
- [ ] `Trip.afterHoursDrivingDuration` populates correctly
- [ ] Vehicles with WorkTime show after-hours values
- [ ] Vehicles without WorkTime show 0 after-hours
- [ ] Grace period setting reduces after-hours
- [ ] Minimum overtime setting filters small values
- [ ] Warning (5h) / Critical (10h) thresholds apply correctly

### Driver Assignment
- [ ] Trips with assigned driver show driver name
- [ ] Trips with `UnknownDriverId` show "Unassigned"
- [ ] Trips with null/missing driver show "Unassigned"
- [ ] Driver status pill reflects Assigned/Unassigned

### Preferences (AddInData)
- [ ] Settings persist after reload (cloud)
- [ ] Settings persist in standalone mode (localStorage)
- [ ] No double-JSON serialization errors

### Error Handling
- [ ] Expired session triggers re-authentication
- [ ] Rate limit (`OverLimitException`) triggers retry with backoff
- [ ] Network errors show retry button
- [ ] Empty states display correctly

## API Permissions Required

The Add-In uses these MyGeotab API methods:

| Entity | Methods | Purpose |
|--------|---------|---------|
| Device | `Get` | Vehicle list, WorkTime, timezone |
| User | `Get` (with `isDriver: true`) | Driver list for name resolution |
| Trip | `Get`, `GetFeed` | Trip data with `afterHoursDrivingDuration` |
| DriverChange | `GetFeed` | Driver logon/logoff history |
| WorkTime | `Get` | Schedule details |
| AddInData | `Get`, `Set`, `Add` | User preferences persistence |

## Rate Limits & Performance

- Exponential backoff: 1s base, max 30s, 5 retries
- Pagination: 5000 trips/page, 5000 devices, 1000 drivers
- Stale times: devices 5min, drivers 10min, trips 2min
- Property selectors used to minimize payload

## AddInData Limits

- Max 100 KB per record
- Max 10 records per Add-In per database
- Used only for user preferences (small JSON object)

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| "Standalone preview" in MyGeotab | Manifest `url` mismatch | Update manifest `url` to exact hosting URL |
| No vehicles loaded | Missing Device permissions | Assign "View Devices" clearance |
| After-hours always 0 | No WorkTime assigned | Configure WorkTime in Administration |
| Preferences not saving | AddInData limit exceeded | Check 100 KB / 10 record limit |
| CORS errors | HTTP instead of HTTPS | MyGeotab requires HTTPS hosting |

## Version History

- 1.0.0: Initial production release with full MyGeotab integration

## License

Internal use only — Geotab Add-In for fleet operations monitoring.