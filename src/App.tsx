import { useState, useMemo, useCallback, useEffect } from 'react';
import { Activity, Clock3, CarFront, Users, RefreshCw, Download, Settings2, PlugZap, AlertTriangle, CheckCircle, XCircle, Loader2, Filter, ChevronDown } from 'lucide-react';
import { getConnectionState, useVehicleSummaries, useDashboardMetrics, useTripDetails, usePreferences, DEFAULT_PREFERENCES, formatDuration } from './geotab/client';
import type { VehicleOvertimeSummary } from './types';
import type { GeotabConnectionState } from './geotab/client';

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
] as const;

type Period = 'today' | 'week' | 'month';

interface MetricProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}

function Metric({ icon, label, value, hint }: MetricProps) {
  return (
    <div className="metric">
      <div className="metricTop"><span>{label}</span><i>{icon}</i></div>
      <strong>{value}</strong>
      <small>{hint}</small>
    </div>
  );
}

interface StatusPillProps {
  status: 'Normal' | 'Warning' | 'Critical' | 'Unassigned';
}

function StatusPill({ status }: StatusPillProps) {
  const icons = {
    Normal: <CheckCircle size={12} />,
    Warning: <AlertTriangle size={12} />,
    Critical: <XCircle size={12} />,
    Unassigned: <AlertTriangle size={12} />,
  };
  return (
    <span className={`pill ${status.toLowerCase()}`}>
      {icons[status]} {status}
    </span>
  );
}

interface LoadingRowProps {
  colSpan: number;
}

function LoadingRow({ colSpan }: LoadingRowProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="loading-row">
        <Loader2 size={20} className="spin" />
        <span>Loading...</span>
      </td>
    </tr>
  );
}

interface EmptyRowProps {
  colSpan: number;
  message: string;
}

function EmptyRow({ colSpan, message }: EmptyRowProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="empty-row">
        <XCircle size={20} />
        <span>{message}</span>
      </td>
    </tr>
  );
}

interface ErrorRowProps {
  colSpan: number;
  message: string;
  onRetry: () => void;
}

function ErrorRow({ colSpan, message, onRetry }: ErrorRowProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="error-row">
        <AlertTriangle size={20} />
        <span>{message}</span>
        <button className="secondary" onClick={onRetry}><RefreshCw size={14} /> Retry</button>
      </td>
    </tr>
  );
}

export default function App() {
  const [connection, setConnection] = useState<GeotabConnectionState>({ connected: false, message: 'Checking MyGeotab runtime…' });
  const [period, setPeriod] = useState<Period>('week');
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'vehicles' | 'trips' | 'settings'>('vehicles');

  const { preferences, updatePreferences, isLoaded: prefsLoaded } = usePreferences();
  const { data: vehicleSummaries, isLoading: vehiclesLoading, error: vehiclesError, refetch: refetchVehicles } = useVehicleSummaries(period);
  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics(period);
  const { data: trips, isLoading: tripsLoading, error: tripsError, refetch: refetchTrips } = useTripDetails(period);

  useEffect(() => {
    getConnectionState().then(setConnection);
  }, []);

  const filteredVehicles = useMemo(() => {
    if (!vehicleSummaries) return [];
    return vehicleSummaries.filter((v) =>
      (v.vehicleName + ' ' + v.driverName).toLowerCase().includes(query.toLowerCase())
    );
  }, [vehicleSummaries, query]);

  const filteredTrips = useMemo(() => {
    if (!trips) return [];
    return trips.filter((t) =>
      (t.vehicle + ' ' + t.driver).toLowerCase().includes(query.toLowerCase())
    );
  }, [trips, query]);

  const exportCsv = useCallback(() => {
    const data = tab === 'vehicles' ? filteredVehicles : filteredTrips;
    if (data.length === 0) return;

    const headers = tab === 'vehicles'
      ? ['Vehicle', 'Driver', 'Driving', 'Idling', 'After-Hours', 'Trips', 'Driver Status', 'Status']
      : ['Vehicle', 'Driver', 'Trip Start', 'Trip End', 'Driving', 'Idling', 'After-Hours', 'Distance'];

    const lines = [
      headers,
      ...data.map((row) =>
        tab === 'vehicles'
          ? [
              row.vehicleName,
              row.driverName,
              formatDuration(row.totalDrivingMs),
              formatDuration(row.totalIdlingMs),
              formatDuration(row.adjustedAfterHoursMs),
              String(row.tripCount),
              row.driverStatus,
              row.status,
            ]
          : [
              row.vehicle,
              row.driver,
              row.start,
              row.stop,
              formatDuration(row.drivingDuration),
              formatDuration(row.idlingDuration),
              formatDuration(row.afterHoursDrivingDuration),
              row.distance + ' km',
            ]
      ),
    ];

    const csv = lines.map((line) => line.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `after-hours-${tab}-${period}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [tab, filteredVehicles, filteredTrips, period]);

  const handlePeriodChange = (newPeriod: Period) => {
    setPeriod(newPeriod);
    updatePreferences({ monitoringPeriod: newPeriod });
  };

  const handleRulesChange = (field: keyof typeof DEFAULT_PREFERENCES.overtimeRules, value: number) => {
    updatePreferences({
      overtimeRules: { ...preferences.overtimeRules, [field]: value },
    });
  };

  const isLoading = vehiclesLoading || metricsLoading || tripsLoading;
  const hasError = vehiclesError || tripsError;

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="brandIcon"><Activity size={20} /></div>
          <div>
            <strong>After-Hours Monitoring</strong>
            <small>Vehicle-based driving activity outside working hours</small>
          </div>
        </div>
        <div className={`connection ${connection.connected ? 'online' : 'offline'}`}>
          <span />
          {connection.connected ? `Connected to MyGeotab (${connection.database ?? ''})` : 'Preview / Not connected'}
        </div>
      </header>

      <section className="intro">
        <div>
          <div className="eyebrow">FLEET OPERATIONS</div>
          <h1>After-Hours Driving Overview</h1>
          <p>Monitor vehicle driving activity outside configured working hours.</p>
        </div>
        <div className="actions">
          <select value={period} onChange={(e) => handlePeriodChange(e.target.value as Period)}>
            {PERIOD_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <button className="secondary" onClick={() => { refetchVehicles(); refetchTrips(); getConnectionState().then(setConnection); }}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </section>

      {!connection.connected && (
        <div className="notice">
          <PlugZap size={18} />
          <span>
            <b>Demo preview:</b> {connection.message} Connect via MyGeotab Add-In to view live data.
          </span>
        </div>
      )}

      <section className="metrics">
        <Metric icon={<Clock3 />} label="Total After-Hours Driving" value={`${metrics?.totalAfterHoursHours?.toFixed(2) ?? '0.00'} hrs`} hint={metricsLoading ? 'Loading...' : 'Vehicle driving time outside work hours'}/>
        <Metric icon={<CarFront />} label="Vehicles with After-Hours Activity" value={String(metrics?.vehiclesWithAfterHours ?? 0)} hint={metricsLoading ? 'Loading...' : 'Vehicles driven after hours'}/>
        <Metric icon={<Users />} label="Unassigned Driver Activity" value={String(metrics?.unassignedCount ?? 0)} hint={metricsLoading ? 'Loading...' : 'Trips without identified driver'}/>
        <Metric icon={<Activity />} label="Total Monitored Vehicles" value={String(metrics?.totalVehicles ?? 0)} hint={metricsLoading ? 'Loading...' : 'Vehicles in your data scope'}/>
      </section>

      <nav className="tabs">
        <button className={tab === 'vehicles' ? 'active' : ''} onClick={() => setTab('vehicles')}>
          <CarFront size={16} /> Vehicle Monitoring
        </button>
        <button className={tab === 'trips' ? 'active' : ''} onClick={() => setTab('trips')}>
          <Activity size={16} /> Trip Details
        </button>
        <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>
          <Settings2 size={16} /> Settings
        </button>
      </nav>

      {tab === 'vehicles' && (
        <section className="panel">
          <div className="panelHead">
            <div>
              <h2>Vehicle After-Hours Activity</h2>
              <p>Driving duration outside configured working hours per vehicle.</p>
            </div>
            <div className="actions">
              <div className="searchWrapper">
                <Filter size={16} />
                <input placeholder="Search vehicle or driver" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <button onClick={exportCsv} disabled={filteredVehicles.length === 0}>
                <Download size={16} /> Export CSV
              </button>
            </div>
          </div>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Driver</th>
                  <th>Driving</th>
                  <th>Idling</th>
                  <th>After-Hours</th>
                  <th>Trips</th>
                  <th>Driver Status</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {vehiclesLoading ? (
                  <LoadingRow colSpan={8} />
                ) : hasError ? (
                  <ErrorRow colSpan={8} message={vehiclesError?.message || 'Failed to load vehicles'} onRetry={refetchVehicles} />
                ) : filteredVehicles.length === 0 ? (
                  <EmptyRow colSpan={8} message="No vehicles found" />
                ) : (
                  filteredVehicles.map((v) => (
                    <tr key={v.vehicleId}>
                      <td><b>{v.vehicleName}</b></td>
                      <td>{v.driverName}</td>
                      <td>{formatDuration(v.totalDrivingMs)}</td>
                      <td>{formatDuration(v.totalIdlingMs)}</td>
                      <td className="strong">{formatDuration(v.adjustedAfterHoursMs)}</td>
                      <td>{v.tripCount}</td>
                      <td>{v.driverStatus}</td>
                      <td><StatusPill status={v.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="footnote">
            After-hours driving is based on vehicle trips outside MyGeotab WorkTime configuration. This is an operational indicator, not confirmed employee attendance or payroll overtime.
          </div>
        </section>
      )}

      {tab === 'trips' && (
        <section className="panel">
          <div className="panelHead">
            <div>
              <h2>Trip Details</h2>
              <p>Individual trips with after-hours driving breakdown.</p>
            </div>
            <div className="actions">
              <div className="searchWrapper">
                <Filter size={16} />
                <input placeholder="Search vehicle or driver" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <button onClick={exportCsv} disabled={filteredTrips.length === 0}>
                <Download size={16} /> Export CSV
              </button>
            </div>
          </div>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Driver</th>
                  <th>Trip Start</th>
                  <th>Trip End</th>
                  <th>Driving</th>
                  <th>Idling</th>
                  <th>After-Hours</th>
                  <th>Distance</th>
                </tr>
              </thead>
              <tbody>
                {tripsLoading ? (
                  <LoadingRow colSpan={8} />
                ) : hasError ? (
                  <ErrorRow colSpan={8} message={tripsError?.message || 'Failed to load trips'} onRetry={refetchTrips} />
                ) : filteredTrips.length === 0 ? (
                  <EmptyRow colSpan={8} message="No trips found" />
                ) : (
                  filteredTrips.map((t) => (
                    <tr key={t.id}>
                      <td>{t.vehicle}</td>
                      <td>{t.driver}</td>
                      <td>{t.start}</td>
                      <td>{t.stop}</td>
                      <td>{formatDuration(t.drivingDuration)}</td>
                      <td>{formatDuration(t.idlingDuration)}</td>
                      <td className="strong">{formatDuration(t.afterHoursDrivingDuration)}</td>
                      <td>{t.distance} km</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="footnote">
            Trip data retrieved from MyGeotab API. After-hours duration calculated using vehicle WorkTime and timezone settings.
          </div>
        </section>
      )}

      {tab === 'settings' && (
        <section className="panel settings">
          <div className="panelHead">
            <div>
              <h2>Monitoring Settings</h2>
              <p>Configure thresholds and preferences. Work schedules are managed in MyGeotab Administration.</p>
            </div>
            <Settings2 />
          </div>

          <div className="formGrid">
            <label>
              Monitoring Period
              <select value={period} onChange={(e) => handlePeriodChange(e.target.value as Period)}>
                {PERIOD_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </label>

            <label>
              Grace Period (minutes)
              <input
                type="number"
                min="0"
                max="120"
                value={preferences.overtimeRules.gracePeriodMinutes}
                onChange={(e) => handleRulesChange('gracePeriodMinutes', parseInt(e.target.value) || 0)}
              />
            </label>

            <label>
              Minimum Overtime (minutes)
              <input
                type="number"
                min="0"
                max="120"
                value={preferences.overtimeRules.minimumOvertimeMinutes}
                onChange={(e) => handleRulesChange('minimumOvertimeMinutes', parseInt(e.target.value) || 0)}
              />
            </label>

            <label>
              Warning Threshold (hours)
              <input
                type="number"
                min="0"
                max="24"
                step="0.5"
                value={preferences.overtimeRules.warningThresholdHours}
                onChange={(e) => handleRulesChange('warningThresholdHours', parseFloat(e.target.value) || 0)}
              />
            </label>

            <label>
              Critical Threshold (hours)
              <input
                type="number"
                min="0"
                max="24"
                step="0.5"
                value={preferences.overtimeRules.criticalThresholdHours}
                onChange={(e) => handleRulesChange('criticalThresholdHours', parseFloat(e.target.value) || 0)}
              />
            </label>

            <label>
              Display Timezone
              <select value={preferences.displayTimezone} onChange={(e) => updatePreferences({ displayTimezone: e.target.value })}>
                <option value="Asia/Jakarta">Asia/Jakarta</option>
                <option value="Asia/Makassar">Asia/Makassar</option>
                <option value="Asia/Jayapura">Asia/Jayapura</option>
                <option value="UTC">UTC</option>
              </select>
            </label>

            <label>
              Week Start Day
              <select value={preferences.weekStartDay} onChange={(e) => updatePreferences({ weekStartDay: parseInt(e.target.value) as 0 | 1 | 6 })}>
                <option value={1}>Monday</option>
                <option value={0}>Sunday</option>
                <option value={6}>Saturday</option>
              </select>
            </label>
          </div>

          <div className="footnote">
            <strong>Work Schedules:</strong> Vehicle working hours are configured in MyGeotab Administration → Vehicles → Work Time.
            This Add-In reads those settings and calculates after-hours driving using native Trip.afterHoursDrivingDuration.
            <br /><br />
            <strong>Data Persistence:</strong> Preferences are stored in MyGeotab AddInData (cloud) with localStorage fallback.
            {prefsLoaded ? ' <span className="success">✓ Loaded</span>' : ' <span className="loading">Loading...</span>'}
          </div>
        </section>
      )}

      <footer>Geotab Vehicle After-Hours Monitoring <span>MyGeotab Add-In</span></footer>
    </main>
  );
}