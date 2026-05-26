import { useState, useMemo } from 'react'
import { CAM_CONFIG, MOCK_DATA } from '../config'
import CameraRow from './CameraRow'

export default function CameraTable({ type, sortOrder, overviewReports, onEvidence }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const reports = useMemo(() => {
    if (!overviewReports) return [];
    return [...overviewReports].sort((a, b) => {
      const d1 = new Date(a.createdAt).getTime();
      const d2 = new Date(b.createdAt).getTime();
      return sortOrder === 'asc' ? d1 - d2 : d2 - d1;
    });
  }, [overviewReports, sortOrder]);

  const total = reports.length;

  const cfg = CAM_CONFIG[type]
  if (!overviewReports || overviewReports.length === 0) return null

  const normal = reports.filter(r => !r.resourceId?.toUpperCase().startsWith('X'))
  const xGroup = reports.filter(r => r.resourceId?.toUpperCase().startsWith('X'))
  const avgAccCm = useMemo(() => (overviewReports.reduce((s, r) => s + (r.accuracy ?? 0), 0) / (overviewReports.length || 1) * 100).toFixed(2), [overviewReports])

  return (
    <div className="camera-block">
      <div className={`table-header th-${cfg.key}`}>
        <div className="th-left" style={{ flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => setIsExpanded(!isExpanded)} title={isExpanded ? "Collapse" : "Expand"}>
          <div style={{ marginRight: 16, color: cfg.color, background: `rgba(${cfg.rgb},0.1)`, borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
          <div className="cam-icon" style={{ background: `rgba(${cfg.rgb},0.1)`, border: `1px solid rgba(${cfg.rgb},0.25)` }}>
            <img src={`/${cfg.key}.png`} alt={type} style={{ width: 26, height: 26, objectFit: 'contain' }}
              onError={e => { e.target.style.display='none'; e.target.parentNode.innerHTML = cfg.emoji }} />
          </div>
          <div>
            <div className="cam-title" style={{ color: cfg.color }}>{type}</div>
            <div className="cam-subtitle">Surveillance System · CCTV</div>
          </div>
        </div>

        <div className="th-center" style={{ flex: 1 }}></div>

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
