import { useMemo } from 'react'
import { CAMERA_TYPES, CAM_CONFIG, isXSeries } from '../config'

export default function SummaryTable({ byType, totalStd, totalX, totalAll }) {
  // Single-pass: counts already partitioned by caller
  const rows = useMemo(() => [
    {
      label: 'All',
      badgeClass: 'badge-all',
      counts: CAMERA_TYPES.map(t => byType[t].length),
      total: totalAll,
      totalColor: 'var(--white)',
    },
    {
      label: 'Standard',
      badgeClass: 'badge-std',
      counts: CAMERA_TYPES.map(t => byType[t].filter(r => !isXSeries(r)).length),
      total: totalStd,
      totalColor: 'var(--accent)',
    },
    {
      label: 'X-Series',
      badgeClass: 'badge-x',
      counts: CAMERA_TYPES.map(t => byType[t].filter(r => isXSeries(r)).length),
      total: totalX,
      totalColor: 'var(--gold)',
    },
  ], [byType, totalStd, totalX, totalAll])

  return (
    <div className="summary-table-wrap">
      <div className="summary-table">
        {/* Header row */}
        <div className="st-row st-head">
          <div className="st-cell st-label-cell" />
          {CAMERA_TYPES.map(type => (
            <div key={type} className="st-cell st-head-cell">
              <div className="st-head-icon" style={{ background: `rgba(${CAM_CONFIG[type].rgb},0.1)`, border: `1px solid rgba(${CAM_CONFIG[type].rgb},0.25)` }}>
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
