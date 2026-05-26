import { formatDate, mToCm } from '../config'

export default function EvidenceModal({ report, onClose }) {
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
