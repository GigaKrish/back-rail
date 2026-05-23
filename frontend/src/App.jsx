import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './index.css'

const CAMERA_TYPES = ['PTZ Camera', 'Bullet Camera', 'UHD Camera', 'Dome Camera']

const CAM_CONFIG = {
  'PTZ Camera':    { key: 'ptz',    color: '#0066cc', emoji: '📷', shape: 'circle' },
  'Bullet Camera': { key: 'bullet', color: '#e05a20', emoji: '📸', shape: 'square' },
  'UHD Camera':    { key: 'uhd',    color: '#7c3aed', emoji: '🎥', shape: 'triangle' },
  'Dome Camera':   { key: 'dome',   color: '#1a8a4a', emoji: '📹', shape: 'diamond' },
}

function makeShapeIcon(color, shape) {
  let svgPath = '';
  if (shape === 'circle') {
    svgPath = `<circle cx="8" cy="8" r="7" fill="${color}" stroke="white" stroke-width="1.5" />`;
  } else if (shape === 'square') {
    svgPath = `<rect x="1" y="1" width="14" height="14" rx="2" fill="${color}" stroke="white" stroke-width="1.5" />`;
  } else if (shape === 'triangle') {
    svgPath = `<polygon points="8,1 15,14 1,14" fill="${color}" stroke="white" stroke-width="1.5" stroke-linejoin="round" />`;
  } else if (shape === 'diamond') {
    svgPath = `<polygon points="8,1 15,8 8,15 1,8" fill="${color}" stroke="white" stroke-width="1.5" stroke-linejoin="round" />`;
  }
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
    <defs><filter id="sh"><feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="${color}" flood-opacity="0.5"/></filter></defs>
    <g filter="url(#sh)">
      ${svgPath}
    </g>
  </svg>`;
  return L.divIcon({ html: svg, className: '', iconSize: [16, 16], iconAnchor: [8, 8], popupAnchor: [0, -10] });
}

const MAP_ICONS = Object.fromEntries(
  Object.entries(CAM_CONFIG).map(([type, cfg]) => [type, makeShapeIcon(cfg.color, cfg.shape)])
)
const PNG_ICONS = Object.fromEntries(
  Object.entries(CAM_CONFIG).map(([type, cfg]) => [
    type,
    L.icon({ iconUrl: `/${cfg.key}.png`, iconSize: [18, 18], iconAnchor: [9, 18], popupAnchor: [0, -20] }),
  ])
)

function formatDate(iso) {
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  }
}

function hexToRgb(hex) {
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`
}

function mToCm(m) { return (m * 100).toFixed(1) }
function isXSeries(report) { return report.resourceId?.toUpperCase().startsWith('X') }

// ── Summary Table ──────────────────────────────────────────────
function SummaryTable({ reports }) {
  const byType = Object.fromEntries(
    CAMERA_TYPES.map(type => [type, reports.filter(r => r.cameraType === type)])
  )

  const rows = [
    {
      label: 'All',
      badgeClass: 'badge-all',
      counts: CAMERA_TYPES.map(t => byType[t].length),
      total: reports.length,
      totalColor: 'var(--white)',
    },
    {
      label: 'Standard',
      badgeClass: 'badge-std',
      counts: CAMERA_TYPES.map(t => byType[t].filter(r => !isXSeries(r)).length),
      total: reports.filter(r => !isXSeries(r)).length,
      totalColor: 'var(--accent)',
    },
    {
      label: 'X-Series',
      badgeClass: 'badge-x',
      counts: CAMERA_TYPES.map(t => byType[t].filter(r => isXSeries(r)).length),
      total: reports.filter(r => isXSeries(r)).length,
      totalColor: 'var(--gold)',
    },
  ]

  return (
    <div className="summary-table-wrap">
      <div className="summary-table">
        {/* Header row */}
        <div className="st-row st-head">
          <div className="st-cell st-label-cell" />
          {CAMERA_TYPES.map(type => (
            <div key={type} className="st-cell st-head-cell">
              <div className="st-head-icon" style={{ background: `rgba(${hexToRgb(CAM_CONFIG[type].color)},0.1)`, border: `1px solid rgba(${hexToRgb(CAM_CONFIG[type].color)},0.25)` }}>
                <img
                  src={`/${CAM_CONFIG[type].key}.png`}
                  alt={type}
                  style={{ width: 18, height: 18, objectFit: 'contain' }}
                  onError={e => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = CAM_CONFIG[type].emoji }}
                />
              </div>
              <span style={{ color: CAM_CONFIG[type].color }}>{type.split(' ')[0]}</span>
            </div>
          ))}
          <div className="st-cell st-head-cell st-total-head">Total</div>
        </div>

        {/* Data rows */}
        {rows.map((row, i) => (
          <div key={i} className={`st-row ${i < rows.length - 1 ? 'st-row-border' : ''}`}>
            <div className="st-cell st-label-cell">
              <span className={`st-badge ${row.badgeClass}`}>{row.label}</span>
            </div>
            {row.counts.map((count, j) => (
              <div key={j} className="st-cell st-num-cell" style={{ color: CAM_CONFIG[CAMERA_TYPES[j]].color }}>
                {count}
              </div>
            ))}
            <div className="st-cell st-num-cell st-total-cell" style={{ color: row.totalColor }}>
              {row.total}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Evidence Modal ─────────────────────────────────────────────
function EvidenceModal({ report, onClose }) {
  if (!report) return null
  const { date, time } = formatDate(report.createdAt)
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          <span>📸 EVIDENCE — UID {report.unique_id}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {report.photos?.length > 0 ? (
          <img src={report.photos[0]} alt="Evidence" className="modal-img"
            onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }} />
        ) : null}
        <div className="modal-img-placeholder" style={{ display: report.photos?.length > 0 ? 'none' : 'flex' }}>
          NO IMAGE AVAILABLE
        </div>
        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            ['Resource ID', report.resourceId],
            ['Camera Type', report.cameraType],
            ['Date', date],
            ['Time', time],
            ['Latitude', report.location?.latitude?.toFixed(7)],
            ['Longitude', report.location?.longitude?.toFixed(7)],
            ['Control Value', `±${mToCm(report.accuracy ?? 0)} cm`],
            ['Device', report.deviceInfo?.deviceName || '—'],
          ].map(([k, v]) => (
            <div key={k} style={{ background: 'rgba(0,102,204,0.04)', border: '1px solid rgba(0,102,204,0.12)', padding: '8px 12px', borderRadius: 6 }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: 'var(--muted)', marginBottom: 2, textTransform: 'uppercase' }}>{k}</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{v}</div>
            </div>
          ))}
        </div>
        {report.remark && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(184,134,11,0.07)', border: '1px solid rgba(184,134,11,0.25)', borderRadius: 6, fontSize: 13 }}>
            <span style={{ color: 'var(--gold)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Remark</span>
            {report.remark}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Camera Row ─────────────────────────────────────────────────
function CameraRow({ report, onEvidence }) {
  const { date, time } = formatDate(report.createdAt)
  const acc = report.accuracy ?? 0
  const accPct = Math.max(5, 100 - acc * 200)
  const isX = report.resourceId?.toUpperCase().startsWith('X')
  return (
    <tr>
      <td><span className="uid-badge">#{report.unique_id}</span></td>
      <td><span className={`rid-badge ${isX ? '' : 'normal'}`}>{report.resourceId}</span></td>
      <td>
        <div className="coord">{report.location?.latitude?.toFixed(7)}</div>
        <div className="coord">{report.location?.longitude?.toFixed(7)}</div>
      </td>
      <td>
        <div className="cv-bar-wrap">
          <span className="cv-val">±{mToCm(acc)} cm</span>
          <div className="cv-bar"><div className="cv-fill" style={{ width: `${accPct}%` }} /></div>
        </div>
      </td>
      <td>
        <div className="datetime"><span>{date}</span>{time}</div>
      </td>
      <td>
        <div className="remark-cell" title={report.remark}>
          {report.remark || <span className="empty">— none —</span>}
        </div>
      </td>
      <td>
        <button className="evidence-btn" onClick={() => onEvidence(report)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
          VIEW
        </button>
      </td>
    </tr>
  )
}

// ── Camera Table ───────────────────────────────────────────────
function CameraTable({ type, sortOrder, overviewReports, onEvidence }) {
  const [reports, setReports] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const pageSize = 30;
  
  useEffect(() => { setPage(1) }, [sortOrder]);

  useEffect(() => {
    setLoading(true);
    fetch(`https://back-rail.onrender.com/api/reports?sort=${sortOrder}&page=${page}&limit=${pageSize}&cameraType=${encodeURIComponent(type)}`)
      .then(r => r.json())
      .then(res => {
         const arr = Array.isArray(res) ? res : (res.data || []);
         setReports(arr);
         setTotal(res.total || arr.length);
      })
      .catch(() => {
         console.warn('API unavailable for table — using mock data')
         const mockForType = MOCK_DATA.filter(r => r.cameraType === type);
         setReports(mockForType.slice((page-1)*pageSize, page*pageSize));
         setTotal(mockForType.length);
      })
      .finally(() => setLoading(false));
  }, [type, sortOrder, page]);

  const cfg = CAM_CONFIG[type]
  if (!overviewReports || overviewReports.length === 0) return null

  const totalPages = Math.ceil(total / pageSize) || 1;
  const normal = reports.filter(r => !r.resourceId?.toUpperCase().startsWith('X'))
  const xGroup = reports.filter(r => r.resourceId?.toUpperCase().startsWith('X'))
  const avgAccCm = (overviewReports.reduce((s, r) => s + (r.accuracy ?? 0), 0) / (overviewReports.length || 1) * 100).toFixed(2)

  return (
    <div className="camera-block">
      <div className={`table-header th-${cfg.key}`}>
        <div className="th-left" style={{ flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => setIsExpanded(!isExpanded)} title={isExpanded ? "Collapse" : "Expand"}>
          <div style={{ marginRight: 16, color: cfg.color, background: `rgba(${hexToRgb(cfg.color)},0.1)`, borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
          <div className="cam-icon" style={{ background: `rgba(${hexToRgb(cfg.color)},0.1)`, border: `1px solid rgba(${hexToRgb(cfg.color)},0.25)` }}>
            <img src={`/${cfg.key}.png`} alt={type} style={{ width: 26, height: 26, objectFit: 'contain' }}
              onError={e => { e.target.style.display='none'; e.target.parentNode.innerHTML = cfg.emoji }} />
          </div>
          <div>
            <div className="cam-title" style={{ color: cfg.color }}>{type}</div>
            <div className="cam-subtitle">Surveillance System · CCTV</div>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="th-center" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
            <button 
              style={{ padding: '6px 16px', background: '#ffffff', border: `1px solid rgba(${hexToRgb(cfg.color)}, 0.3)`, borderRadius: 6, color: cfg.color, cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1, fontSize: 12, fontWeight: 700, letterSpacing: 1, transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
              disabled={page === 1} 
              onClick={() => setPage(p => p - 1)}
            >
              PREV
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 14, color: 'var(--white)', fontWeight: 700, letterSpacing: 1, fontFamily: 'Space Mono, monospace' }}>PAGE {page} <span style={{ color: 'var(--muted)', fontWeight: 500 }}>/ {totalPages}</span></span>
              <span style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}</span>
            </div>
            <button 
              style={{ padding: '6px 16px', background: '#ffffff', border: `1px solid rgba(${hexToRgb(cfg.color)}, 0.3)`, borderRadius: 6, color: cfg.color, cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1, fontSize: 12, fontWeight: 700, letterSpacing: 1, transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
              disabled={page === totalPages} 
              onClick={() => setPage(p => p + 1)}
            >
              NEXT
            </button>
          </div>
        )}
        {!totalPages || totalPages <= 1 ? <div style={{ flex: 1 }} /> : null}

        <div className="th-right" style={{ flex: 1, textAlign: 'right' }}>
          <div className="total-label">Total Units</div>
          <div className="total-count" style={{ color: cfg.color }}>{total}</div>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          {isExpanded && (
            <thead>
              <tr>
                <th>UID</th><th>Resource ID</th><th>Coordinates</th>
                <th>Control Value</th><th>Date / Time</th><th>Remark</th><th>Evidence</th>
              </tr>
            </thead>
          )}
          <tbody>
            {isExpanded && (
              <>
                {normal.map(r => <CameraRow key={r._id} report={r} onEvidence={onEvidence} />)}
                {xGroup.length > 0 && (
                  <>
                    <tr className="x-section-divider">
                      <td colSpan={7}>
                        <div className="x-section-label">X-Series Resources · {xGroup.length} unit{xGroup.length !== 1 ? 's' : ''}</div>
                      </td>
                    </tr>
                    {xGroup.map(r => <CameraRow key={r._id} report={r} onEvidence={onEvidence} />)}
                  </>
                )}
              </>
            )}
            <tr className="summary-row">
              <td colSpan={7}>
                <div className="summary-stats">
                  {[
                    ['Total Cameras', total, cfg.color],
                    ['Avg Control Value', `±${avgAccCm} cm`, null],
                    ['X-Series', overviewReports.filter(r => r.resourceId?.toUpperCase().startsWith('X')).length, 'var(--gold)'],
                    ['Standard', overviewReports.filter(r => !r.resourceId?.toUpperCase().startsWith('X')).length, null],
                    ['With Remarks', overviewReports.filter(r => r.remark).length, null],
                  ].map(([label, val, color]) => (
                    <div key={label} className="stat-item">
                      <span className="stat-label">{label}</span>
                      <span className="stat-value" style={color ? { color } : {}}>{val}</span>
                    </div>
                  ))}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Map View ───────────────────────────────────────────────────
function MapView({ reports, onEvidence }) {
  const [iconMode, setIconMode] = useState('svg')
  const [mapType, setMapType] = useState('street')
  const [isMapExpanded, setIsMapExpanded] = useState(false)
  const validReports = reports.filter(r => r.location?.latitude && r.location?.longitude)
  const center = validReports.length > 0
    ? [validReports[0].location.latitude, validReports[0].location.longitude]
    : [25.582, 85.044]
  const getIcon = (type) => iconMode === 'png'
    ? (PNG_ICONS[type] || makeShapeIcon(CAM_CONFIG[type]?.color || '#666', CAM_CONFIG[type]?.shape || 'circle'))
    : (MAP_ICONS[type] || makeShapeIcon('#666', 'circle'))

  const renderMapChildren = () => (
    <>
      {mapType === 'satellite' 
        ? <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="Tiles &copy; Esri" />
        : <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
      }
      {validReports.filter(r => !isXSeries(r)).map(report => (
        <CircleMarker key={`ring-${report._id}`}
          center={[report.location.latitude, report.location.longitude]}
          radius={10}
          pathOptions={{ color: CAM_CONFIG[report.cameraType]?.color || '#0066cc', weight: 1.5, opacity: 0.85, fillColor: CAM_CONFIG[report.cameraType]?.color || '#0066cc', fillOpacity: 0.12, dashArray: '4 3' }}
        />
      ))}
      {validReports.map(report => {
        const { date, time } = formatDate(report.createdAt)
        const xSeries = isXSeries(report)
        return (
          <Marker key={report._id} position={[report.location.latitude, report.location.longitude]} icon={getIcon(report.cameraType)}>
            <Popup className="custom-popup">
              <div className="popup-content">
                <div className="popup-type" style={{ color: CAM_CONFIG[report.cameraType]?.color || '#333' }}>
                  {report.cameraType}
                  {!xSeries && <span className="popup-highlight-badge">● ACTIVE</span>}
                </div>
                {[['Resource ID', report.resourceId, !xSeries ? { color: '#0066cc', fontWeight: 700 } : {}],
                  ['UID', `#${report.unique_id}`, {}], ['Date', date, {}], ['Time', time, {}],
                  ['Control Value', `±${mToCm(report.accuracy ?? 0)} cm`, {}],
                  ['Lat', report.location.latitude.toFixed(5), {}],
                  ['Lng', report.location.longitude.toFixed(5), {}],
                ].map(([k, v, s]) => (
                  <div key={k} className="popup-row"><span>{k}</span><span style={s}>{v}</span></div>
                ))}
                {!xSeries && <div className="popup-active-strip">✦ Standard Series · Highlighted Unit</div>}
                <button className="popup-evidence-btn" onClick={() => onEvidence(report)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  VIEW EVIDENCE
                </button>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </>
  )

  return (
    <div className="map-section">
      <div className="map-header">
        <div>
          <div className="section-title" style={{ marginBottom: 4 }}>Live Surveillance Map</div>
          <div className="map-title">CAMERA DEPLOYMENT VIEW</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="icon-toggle">
              <button className={`icon-toggle-btn ${mapType === 'street' ? 'active' : ''}`} onClick={() => setMapType('street')}>
                STREET
              </button>
              <button className={`icon-toggle-btn ${mapType === 'satellite' ? 'active' : ''}`} onClick={() => setMapType('satellite')}>
                SATELLITE
              </button>
            </div>
            <div className="icon-toggle">
              <button className={`icon-toggle-btn ${iconMode === 'svg' ? 'active' : ''}`} onClick={() => setIconMode('svg')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/></svg>
                SVG Icons
              </button>
              <button className={`icon-toggle-btn ${iconMode === 'png' ? 'active' : ''}`} onClick={() => setIconMode('png')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                PNG Icons
              </button>
            </div>
            <div className="icon-toggle">
              <button className="icon-toggle-btn" onClick={() => setIsMapExpanded(true)} style={{ color: 'var(--accent)' }}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                POP OUT
              </button>
            </div>
          </div>
          <div className="map-legend">
            <div className="legend-item" style={{ fontSize: 14, fontWeight: 700, gap: 10 }}>
              <div className="legend-dot" style={{ width: 18, height: 18, background: 'transparent', border: '2px dashed var(--gold)', borderRadius: '50%' }} />
              Shared CAD-Drawing
            </div>
            {CAMERA_TYPES.map(type => {
              const cfg = CAM_CONFIG[type];
              return (
                <div key={type} className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 700 }}>
                  <svg width="18" height="18" viewBox="0 0 16 16" style={{ filter: `drop-shadow(0px 1px 2px ${cfg.color}90)` }}>
                    {cfg.shape === 'circle' && <circle cx="8" cy="8" r="7" fill={cfg.color} stroke="white" strokeWidth="1.5" />}
                    {cfg.shape === 'square' && <rect x="1" y="1" width="14" height="14" rx="2" fill={cfg.color} stroke="white" strokeWidth="1.5" />}
                    {cfg.shape === 'triangle' && <polygon points="8,1 15,14 1,14" fill={cfg.color} stroke="white" strokeWidth="1.5" strokeLinejoin="round" />}
                    {cfg.shape === 'diamond' && <polygon points="8,1 15,8 8,15 1,8" fill={cfg.color} stroke="white" strokeWidth="1.5" strokeLinejoin="round" />}
                  </svg>
                  {type}
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <div className="map-container" style={{ height: 460 }}>
        <MapContainer center={center} zoom={18} style={{ height: '100%', width: '100%' }}>
          {renderMapChildren()}
        </MapContainer>
      </div>
      <div className="map-footnote">
        <span className="footnote-highlight">◎ Dashed ring = Standard series (highlighted)</span>
        <span>X-series markers shown without ring</span>
        <span style={{ marginLeft: 'auto', opacity: 0.5 }}>
          {validReports.filter(r => !isXSeries(r)).length} standard · {validReports.filter(r => isXSeries(r)).length} X-series
        </span>
      </div>

      {isMapExpanded && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--navy)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(240, 244, 248, 0.95)', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(20px)' }}>
            <div>
              <div className="section-title" style={{ marginBottom: 4, paddingBottom: 0, borderBottom: 'none' }}>Live Surveillance Map</div>
              <div className="map-title" style={{ color: 'var(--accent)' }}>CAMERA DEPLOYMENT VIEW (FULL SCREEN)</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div className="icon-toggle">
                  <button className={`icon-toggle-btn ${mapType === 'street' ? 'active' : ''}`} onClick={() => setMapType('street')}>
                    STREET
                  </button>
                  <button className={`icon-toggle-btn ${mapType === 'satellite' ? 'active' : ''}`} onClick={() => setMapType('satellite')}>
                    SATELLITE
                  </button>
                </div>
                <div className="icon-toggle">
                  <button className={`icon-toggle-btn ${iconMode === 'svg' ? 'active' : ''}`} onClick={() => setIconMode('svg')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/></svg>
                    SVG
                  </button>
                  <button className={`icon-toggle-btn ${iconMode === 'png' ? 'active' : ''}`} onClick={() => setIconMode('png')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                    PNG
                  </button>
                </div>
              </div>
              <button className="modal-close" onClick={() => setIsMapExpanded(false)} style={{ fontSize: 28, color: 'var(--accent)', cursor: 'pointer', background: 'none', border: 'none' }}>✕</button>
            </div>
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <MapContainer center={center} zoom={18} style={{ height: '100%', width: '100%' }}>
               {renderMapChildren()}
            </MapContainer>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

// ── Mock data ──────────────────────────────────────────────────
const MOCK_DATA = [
  { _id:'1', cameraType:'Bullet Camera', resourceId:'X15', remark:'', photos:[], unique_id:'81970', location:{latitude:25.5823144,longitude:85.0444481}, accuracy:0.014, createdAt:'2026-05-22T08:52:59.765Z', deviceInfo:{deviceName:'Redmi A4 5G'} },
  { _id:'2', cameraType:'Bullet Camera', resourceId:'X13', remark:'', photos:[], unique_id:'55405', location:{latitude:25.5823019,longitude:85.0444451}, accuracy:0.046, createdAt:'2026-05-22T08:52:06.077Z', deviceInfo:{deviceName:'Redmi A4 5G'} },
  { _id:'3', cameraType:'Bullet Camera', resourceId:'B01', remark:'Platform 1 entry', photos:[], unique_id:'33301', location:{latitude:25.5824,longitude:85.0446}, accuracy:0.022, createdAt:'2026-05-22T07:45:00.000Z', deviceInfo:{deviceName:'Redmi A4 5G'} },
  { _id:'4', cameraType:'PTZ Camera', resourceId:'P01', remark:'Main entrance', photos:[], unique_id:'11201', location:{latitude:25.5825,longitude:85.0447}, accuracy:0.012, createdAt:'2026-05-22T07:30:00.000Z', deviceInfo:{deviceName:'Redmi A4 5G'} },
  { _id:'5', cameraType:'PTZ Camera', resourceId:'X01', remark:'Gate A', photos:[], unique_id:'11202', location:{latitude:25.5822,longitude:85.0443}, accuracy:0.019, createdAt:'2026-05-22T07:35:00.000Z', deviceInfo:{deviceName:'Redmi A4 5G'} },
  { _id:'6', cameraType:'UHD Camera', resourceId:'U01', remark:'VIP lounge', photos:[], unique_id:'22301', location:{latitude:25.5826,longitude:85.0448}, accuracy:0.018, createdAt:'2026-05-22T08:00:00.000Z', deviceInfo:{deviceName:'Redmi A4 5G'} },
  { _id:'7', cameraType:'UHD Camera', resourceId:'X02', remark:'', photos:[], unique_id:'22302', location:{latitude:25.5821,longitude:85.0441}, accuracy:0.033, createdAt:'2026-05-22T08:05:00.000Z', deviceInfo:{deviceName:'Redmi A4 5G'} },
  { _id:'8', cameraType:'Dome Camera', resourceId:'D01', remark:'Waiting hall', photos:[], unique_id:'44401', location:{latitude:25.5820,longitude:85.0440}, accuracy:0.027, createdAt:'2026-05-22T08:15:00.000Z', deviceInfo:{deviceName:'Redmi A4 5G'} },
  { _id:'9', cameraType:'Dome Camera', resourceId:'X03', remark:'', photos:[], unique_id:'44402', location:{latitude:25.5819,longitude:85.0439}, accuracy:0.041, createdAt:'2026-05-22T08:20:00.000Z', deviceInfo:{deviceName:'Redmi A4 5G'} },
]

// ── App ────────────────────────────────────────────────────────
export default function App() {
  const [reports, setReports]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [evidence, setEvidence] = useState(null)
  const [sortOrder, setSortOrder] = useState('desc')

  useEffect(() => {
    setLoading(true);
    fetch(`https://back-rail.onrender.com/api/reports?sort=${sortOrder}`)
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

  const byType = Object.fromEntries(
    CAMERA_TYPES.map(type => [type, reports.filter(r => r.cameraType === type)])
  )

  return (
    <>
      <header className="header">
        <div className="header-logo">
          <img src="/tteg.png" alt="TTEG Logo" className="logo-img"
            onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }} />
          <div style={{ display:'none', alignItems:'center', justifyContent:'center', width:48, height:48, background:'rgba(0,102,204,0.1)', border:'1px solid rgba(0,102,204,0.25)', borderRadius:8, fontSize:22 }}>📡</div>
          <div>
            <div className="logo-text">TTEG</div>
            <div style={{ fontSize:9, letterSpacing:3, color:'var(--muted)', textTransform:'uppercase' }}>Surveillance Report</div>
          </div>
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
            <SummaryTable reports={reports} />

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