import { useEffect, useMemo, useState } from 'react';
import { Activity, Clock3, CarFront, Users, RefreshCw, Download, Settings2, PlugZap } from 'lucide-react';
import { getConnectionState } from './geotab/client';
import type { OvertimeRow, Trip } from './types';

const demoRows: OvertimeRow[] = [
  { driver:'Driver A', vehicle:'Vehicle 001', regularHours:38.5, overtimeHours:6.5, trips:8, status:'High', driverStatus:'Assigned' },
  { driver:'Driver B', vehicle:'Vehicle 002', regularHours:40, overtimeHours:2.0, trips:3, status:'Medium', driverStatus:'Assigned' },
  { driver:'Unassigned Driver', vehicle:'Vehicle 003', regularHours:32, overtimeHours:1.25, trips:2, status:'Unassigned', driverStatus:'Unassigned' },
];
const demoTrips: Trip[] = [
  {id:'preview-1',driver:'Driver A',vehicle:'Vehicle 001',start:'2026-11-17 17:20',end:'2026-11-17 18:10',durationMinutes:50,overtimeMinutes:50,distanceKm:24.2},
  {id:'preview-2',driver:'Driver B',vehicle:'Vehicle 002',start:'2026-11-17 07:10',end:'2026-11-17 07:40',durationMinutes:30,overtimeMinutes:30,distanceKm:12.4},
];
export default function App() {
  const [connection,setConnection] = useState({connected:false,message:'Checking MyGeotab runtime…'});
  const [period,setPeriod] = useState('This month');
  const [query,setQuery] = useState('');
  const [tab,setTab] = useState<'drivers'|'trips'|'settings'>('drivers');
  const [start,setStart] = useState('08:00');
  const [end,setEnd] = useState('17:00');
  useEffect(()=>{ getConnectionState().then(setConnection); },[]);
  const rows = useMemo(()=>demoRows.filter(r=>(r.driver+' '+r.vehicle).toLowerCase().includes(query.toLowerCase())),[query]);
  const exportCsv = () => {
    const lines = [['Driver','Vehicle','Regular hours','Estimated after-hours','Trips','Status'],...rows.map(r=>[r.driver,r.vehicle,r.regularHours,r.overtimeHours,r.trips,r.status])];
    const csv = lines.map(line=>line.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    const a = document.createElement('a'); a.href=url; a.download='overtime-monitoring-preview.csv'; a.click(); URL.revokeObjectURL(url);
  };
  const total = demoRows.reduce((n,r)=>n+r.overtimeHours,0);
  return <main className="shell">
    <header className="topbar"><div className="brand"><div className="brandIcon"><Activity size={20}/></div><div><strong>Overtime Monitoring</strong><small>Vehicle-based driver activity</small></div></div>
      <div className={`connection ${connection.connected?'online':'offline'}`}><span/> {connection.connected?'Connected to MyGeotab':'Preview / Not connected'}</div>
    </header>
    <section className="intro"><div><div className="eyebrow">FLEET OPERATIONS</div><h1>Overtime overview</h1><p>Monitor estimated driving activity outside configured working hours.</p></div>
      <div className="actions"><select value={period} onChange={e=>setPeriod(e.target.value)}><option>This month</option><option>This week</option><option>Today</option></select><button className="secondary" onClick={()=>getConnectionState().then(setConnection)}><RefreshCw size={16}/> Refresh</button></div>
    </section>
    {!connection.connected && <div className="notice"><PlugZap size={18}/><span><b>Demo preview:</b> {connection.message} Displayed rows are sample data and are not retrieved from Geotab.</span></div>}
    <section className="metrics">
      <Metric icon={<Clock3/>} label="Estimated after-hours" value={`${total.toFixed(2)} hrs`} hint="Sample data"/>
      <Metric icon={<Users/>} label="Drivers with activity" value="2" hint="Sample data"/>
      <Metric icon={<CarFront/>} label="Vehicles with activity" value="3" hint="Sample data"/>
      <Metric icon={<Activity/>} label="After-hours trips" value="13" hint="Sample data"/>
    </section>
    <nav className="tabs"><button className={tab==='drivers'?'active':''} onClick={()=>setTab('drivers')}>Driver monitoring</button><button className={tab==='trips'?'active':''} onClick={()=>setTab('trips')}>Trip details</button><button className={tab==='settings'?'active':''} onClick={()=>setTab('settings')}>Overtime settings</button></nav>
    {tab==='drivers' && <section className="panel"><div className="panelHead"><div><h2>Driver overtime</h2><p>Estimated vehicle-based overtime by driver and vehicle.</p></div><div className="actions"><input placeholder="Search driver or vehicle" value={query} onChange={e=>setQuery(e.target.value)}/><button onClick={exportCsv}><Download size={16}/> Export CSV</button></div></div>
      <div className="tableWrap"><table><thead><tr><th>Driver</th><th>Vehicle</th><th>Regular driving</th><th>After-hours</th><th>Trips</th><th>Driver mapping</th><th>Status</th></tr></thead><tbody>{rows.map(r=><tr key={r.vehicle}><td><b>{r.driver}</b></td><td>{r.vehicle}</td><td>{r.regularHours.toFixed(2)} hrs</td><td className="strong">{r.overtimeHours.toFixed(2)} hrs</td><td>{r.trips}</td><td>{r.driverStatus}</td><td><span className={`pill ${r.status.toLowerCase()}`}>{r.status}</span></td></tr>)}</tbody></table></div>
      <div className="footnote">Estimated vehicle-based overtime is an operational indicator, not confirmed employee attendance or payroll overtime.</div>
    </section>}
    {tab==='trips' && <section className="panel"><div className="panelHead"><div><h2>After-hours trip details</h2><p>Sample trip rows for layout preview.</p></div></div><div className="tableWrap"><table><thead><tr><th>Driver</th><th>Vehicle</th><th>Trip start</th><th>Trip end</th><th>Duration</th><th>After-hours</th><th>Distance</th></tr></thead><tbody>{demoTrips.map(t=><tr key={t.id}><td>{t.driver}</td><td>{t.vehicle}</td><td>{t.start}</td><td>{t.end}</td><td>{(t.durationMinutes/60).toFixed(2)} hrs</td><td className="strong">{(t.overtimeMinutes/60).toFixed(2)} hrs</td><td>{t.distanceKm} km</td></tr>)}</tbody></table></div><div className="footnote">Trip data will be replaced by live Geotab API results after the Add-In adapter is configured.</div></section>}
    {tab==='settings' && <section className="panel settings"><div className="panelHead"><div><h2>Working schedule</h2><p>Fallback schedule for overtime calculation. Confirm native Work Hours API availability before production use.</p></div><Settings2/></div><div className="formGrid"><label>Working days<select defaultValue="weekdays"><option value="weekdays">Monday – Friday</option><option value="all">Every day</option><option value="custom">Custom</option></select></label><label>Start time<input type="time" value={start} onChange={e=>setStart(e.target.value)}/></label><label>End time<input type="time" value={end} onChange={e=>setEnd(e.target.value)}/></label><label>Timezone<select defaultValue="Asia/Jakarta"><option>Asia/Jakarta</option><option>Asia/Makassar</option><option>Asia/Jayapura</option></select></label></div><div className="footnote">Settings are currently held in browser state only. No configuration is persisted.</div></section>}
    <footer>OPEX Overtime Monitoring <span>Simple MyGeotab Add-In MVP scaffold</span></footer>
  </main>;
}
function Metric({icon,label,value,hint}:{icon:React.ReactNode;label:string;value:string;hint:string}) {
  return <div className="metric"><div className="metricTop"><span>{label}</span><i>{icon}</i></div><strong>{value}</strong><small>{hint}</small></div>;
}
