import { useState, useEffect, useMemo } from 'react'
import 'leaflet/dist/leaflet.css'
import './index.css'

import { CAMERA_TYPES, MOCK_DATA, isXSeries } from './config'
import SummaryTable from './components/SummaryTable'
import CameraTable from './components/CameraTable'
import MapView from './components/MapView'
import EvidenceModal from './components/EvidenceModal'
import ExportPanel from './components/ExportPanel'

export default function App() {
  const [reports, setReports]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [evidence, setEvidence] = useState(null)
  const [sortOrder, setSortOrder] = useState('desc')

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports?sort=${sortOrder}&limit=100000`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(data => {
        const arr = Array.isArray(data) ? data : (data.data || data.reports || [])
        setReports(arr)
      })
      .catch(() => {
        console.warn('API unavailable — using mock data')
        setReports(MOCK_DATA)
      })
      .finally(() => setLoading(false))
  }, [sortOrder])

  // Single-pass partition + memoize
  const { byType, totalStd, totalX } = useMemo(() => {
    const bt = Object.fromEntries(CAMERA_TYPES.map(t => [t, []]));
    let std = 0, x = 0;
    for (const r of reports) {
      if (bt[r.cameraType]) bt[r.cameraType].push(r);
      if (isXSeries(r)) x++; else std++;
    }
    return { byType: bt, totalStd: std, totalX: x };
  }, [reports])

  return (
    <>
      <header className="header" style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="header-logo">
          <img src="/tteg.png" alt="TTEG Logo" className="logo-img"
            onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }} />
          <div>
            <div className="logo-text">TTEG</div>
            <div style={{ fontSize:9, letterSpacing:3, color:'var(--muted)', textTransform:'uppercase' }}>Surveillance Report</div>
          </div>
        </div>

        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          <ExportPanel reports={reports} />
        </div>

        <div className="header-brand">
          <div className="brand-main">Danapur Railway Station</div>
          <div className="brand-sub">Patna · Bihar · Indian Railways</div>
          <div className="brand-badge">CCTV SURVEILLANCE REPORT</div>
        </div>
      </header>

      <main className="main">
        {loading ? (
          <div className="loading">
            <div className="spinner" />
            <div className="loading-text">Loading surveillance data...</div>
          </div>
        ) : (
          <>
            {/* ── 3-Row Summary Table ── */}
            <SummaryTable byType={byType} totalStd={totalStd} totalX={totalX} totalAll={reports.length} />

            <div className="section-title" style={{ marginTop: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Camera Surveillance Tables</span>
              <select 
                value={sortOrder} 
                onChange={e => setSortOrder(e.target.value)} 
                style={{ padding: '6px 12px', borderRadius: 6, background: '#fff', color: 'var(--accent)', border: '1px solid var(--border)', fontSize: 13, fontWeight: 600, fontFamily: 'Space Mono, monospace', cursor: 'pointer', outline: 'none' }}
              >
                <option value="desc">LATEST TO OLD</option>
                <option value="asc">OLD TO LATEST</option>
              </select>
            </div>

            {CAMERA_TYPES.map(type => (
              <CameraTable key={type} type={type} sortOrder={sortOrder} overviewReports={byType[type]} onEvidence={setEvidence} />
            ))}

            <MapView reports={reports} onEvidence={setEvidence} />
          </>
        )}
      </main>

      {evidence && <EvidenceModal report={evidence} onClose={() => setEvidence(null)} />}
    </>
  )
}