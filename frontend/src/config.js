import L from 'leaflet'

export const CAMERA_TYPES = ['PTZ Camera', 'Bullet Camera', 'UHD Camera', 'Dome Camera']

function hexToRgb(hex) {
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`
}

export const CAM_CONFIG = {
  'PTZ Camera':    { key: 'ptz',    color: '#0066cc', rgb: hexToRgb('#0066cc'), emoji: '📷', shape: 'circle' },
  'Bullet Camera': { key: 'bullet', color: '#e05a20', rgb: hexToRgb('#e05a20'), emoji: '📸', shape: 'square' },
  'UHD Camera':    { key: 'uhd',    color: '#7c3aed', rgb: hexToRgb('#7c3aed'), emoji: '🎥', shape: 'triangle' },
  'Dome Camera':   { key: 'dome',   color: '#1a8a4a', rgb: hexToRgb('#1a8a4a'), emoji: '📹', shape: 'diamond' },
}

export function makeShapeIcon(color, shape) {
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
  
  const filterId = `sh-${shape}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
    <defs><filter id="${filterId}"><feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="${color}" flood-opacity="0.5"/></filter></defs>
    <g filter="url(#${filterId})">
      ${svgPath}
    </g>
  </svg>`;
  return L.divIcon({ html: svg, className: '', iconSize: [16, 16], iconAnchor: [8, 8], popupAnchor: [0, -10] });
}

export const MAP_ICONS = Object.fromEntries(
  Object.entries(CAM_CONFIG).map(([type, cfg]) => [type, makeShapeIcon(cfg.color, cfg.shape)])
)
export const PNG_ICONS = Object.fromEntries(
  Object.entries(CAM_CONFIG).map(([type, cfg]) => [
    type,
    L.icon({ iconUrl: `/${cfg.key}.png`, iconSize: [18, 18], iconAnchor: [9, 18], popupAnchor: [0, -20] }),
  ])
)

export function formatDate(iso) {
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  }
}

export function mToCm(m) { return (m * 100).toFixed(1) }
export function isXSeries(report) { return report.resourceId?.toUpperCase().startsWith('X') }

export const MOCK_DATA = [
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
