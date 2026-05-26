import { useState, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet'
import { CAMERA_TYPES, CAM_CONFIG, MAP_ICONS, PNG_ICONS, makeShapeIcon, formatDate, mToCm, isXSeries } from '../config'

export default function MapView({ reports, onEvidence }) {
  const [iconMode, setIconMode] = useState('svg')
  const [mapType, setMapType] = useState('street')
  const [isMapExpanded, setIsMapExpanded] = useState(false)

  // Single-pass partition: valid reports split into standard vs X-series
  const { validReports, standardReports, xSeriesReports, center } = useMemo(() => {
    const valid = []; const std = []; const xSer = [];
    for (const r of reports) {
      if (!r.location?.latitude || !r.location?.longitude) continue;
      valid.push(r);
      if (isXSeries(r)) xSer.push(r); else std.push(r);
    }
    return {
      validReports: valid,
      standardReports: std,
      xSeriesReports: xSer,
      center: valid.length > 0 ? [valid[0].location.latitude, valid[0].location.longitude] : [25.582, 85.044],
    };
  }, [reports]);

  const getIcon = useCallback((type) => iconMode === 'png'
    ? (PNG_ICONS[type] || makeShapeIcon(CAM_CONFIG[type]?.color || '#666', CAM_CONFIG[type]?.shape || 'circle'))
    : (MAP_ICONS[type] || makeShapeIcon('#666', 'circle')), [iconMode])

  const renderMapChildren = () => (
    <>
      {mapType === 'satellite' 
        ? <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="Tiles &copy; Esri" />
        : <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
      }
      {standardReports.map(report => (
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
          {standardReports.length} standard · {xSeriesReports.length} X-series
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
