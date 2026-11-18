# geotabovertimemonitoring

## OPEX Overtime Monitoring

Simple React + TypeScript UI scaffold for a MyGeotab Add-In.

## Current status

This is a **starter scaffold / UI preview**, not a live Geotab-connected production Add-In yet.

- Dashboard, driver table, trip details, settings UI, and CSV export are included.
- Demo rows are clearly labelled as sample data.
- `src/geotab/client.ts` is the integration boundary to implement using the official MyGeotab Add-In lifecycle and API SDK.
- No database or credential storage is included.
- Do not deploy as production until the Add-In manifest/lifecycle and live API adapter are implemented and tested against an authorized MyGeotab database.

## Run locally

```bash
npm install
npm run dev
```

Open the local Vite URL shown in the terminal.

## Build

```bash
npm run build
```

Build output is generated in `dist/`.

## Next integration steps

1. Confirm the current official MyGeotab Add-In registration/manifest format for the target environment.
2. Implement Add-In lifecycle initialization and obtain the supported API context.
3. Implement live API methods for Device, User, Trip, and DriverChange only after verifying entity/property support and permissions.
4. Replace demo data in `src/App.tsx` with API-backed data.
5. Add timezone-safe interval splitting and unit tests for overnight trips, DST, schedule boundaries, and driver changes.
6. Validate with a real test database; do not treat UI preview as live integration.

## Important calculation note

The included minute-based calculator is a basic starting point. Before production, replace/extend it with robust timezone-aware interval splitting and validate that source trip intervals represent driving duration (not ignition-on or idle duration).
