import { formatDate, mToCm } from '../config'

export default function CameraRow({ report, onEvidence }) {
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
