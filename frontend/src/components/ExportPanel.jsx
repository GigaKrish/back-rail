import { useState } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { CAMERA_TYPES, formatDate, mToCm } from '../config';

export default function ExportPanel() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exporting, setExporting] = useState(false);

  const fetchExportData = async () => {
    let url = '/api/reports/export?';
    if (startDate) url += `startDate=${encodeURIComponent(startDate)}&`;
    if (endDate) url += `endDate=${encodeURIComponent(endDate)}&`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Export failed');
    const res = await response.json();
    return res.data || [];
  };

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      const data = await fetchExportData();
      
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('CCTV Surveillance Report', 14, 22);
      
      doc.setFontSize(11);
      doc.text(`Date Range: ${startDate || 'All'} to ${endDate || 'All'}`, 14, 30);
      doc.text(`Total Records: ${data.length}`, 14, 36);

      let currentY = 44;

      for (const type of CAMERA_TYPES) {
        const typeData = data.filter(r => r.cameraType === type);
        if (typeData.length === 0) continue;

        doc.setFontSize(14);
        doc.text(`Camera Type: ${type} (${typeData.length} records)`, 14, currentY);
        currentY += 6;

        const tableData = typeData.map(r => {
          const { date, time } = formatDate(r.createdAt);
          const link = r.photos?.[0] ? r.photos[0] : 'No Image';
          return [
            r.unique_id || '-',
            r.resourceId || '-',
            `${r.location?.latitude?.toFixed(5) || '-'}, ${r.location?.longitude?.toFixed(5) || '-'}`,
            `±${mToCm(r.accuracy ?? 0)} cm`,
            `${date} ${time}`,
            r.remark || '-',
            link
          ];
        });

        doc.autoTable({
          startY: currentY,
          head: [['UID', 'Resource ID', 'Coordinates', 'Control Value', 'Date / Time', 'Remark', 'Evidence Link']],
          body: tableData,
          theme: 'grid',
          styles: { fontSize: 8 },
          columnStyles: {
            6: { textColor: [0, 102, 204], fontStyle: 'italic' } // Make link look clickable if it's a URL
          },
          didDrawCell: (data) => {
             // If it's the body and the evidence column
             if (data.section === 'body' && data.column.index === 6) {
                const text = data.cell.raw;
                if (text && text.startsWith('http')) {
                  doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url: text });
                }
             }
          }
        });

        currentY = doc.lastAutoTable.finalY + 14;
      }

      doc.save('surveillance_report.pdf');
    } catch (err) {
      console.error(err);
      alert('Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  const handleExportKML = async () => {
    try {
      setExporting(true);
      const data = await fetchExportData();
      
      let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Surveillance Report</name>
    <description>Exported CCTV Surveillance Data</description>
`;

      // Define styles for each camera type
      const colors = {
        'PTZ Camera': 'ff0000ff', // Red (KML is aabbggrr)
        'Bullet Camera': 'ff00ff00', // Green
        'UHD Camera': 'ffff0000', // Blue
        'Dome Camera': 'ff00ffff', // Yellow
      };

      for (const type of CAMERA_TYPES) {
        const color = colors[type] || 'ffffffff';
        kml += `
    <Style id="style_${type.replace(/\s+/g, '_')}">
      <IconStyle>
        <color>${color}</color>
        <scale>1.1</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/pushpin/ylw-pushpin.png</href>
        </Icon>
      </IconStyle>
    </Style>`;
      }

      for (const r of data) {
        if (!r.location?.latitude || !r.location?.longitude) continue;
        const { date, time } = formatDate(r.createdAt);
        const styleId = `style_${(r.cameraType || '').replace(/\s+/g, '_')}`;
        
        let description = `
          <b>Resource ID:</b> ${r.resourceId || '-'}<br/>
          <b>Camera Type:</b> ${r.cameraType || '-'}<br/>
          <b>Date/Time:</b> ${date} ${time}<br/>
          <b>Control Value:</b> ±${mToCm(r.accuracy ?? 0)} cm<br/>
          <b>Remark:</b> ${r.remark || '-'}<br/>
        `;

        if (r.photos?.[0]) {
          description += `<br/><b>Evidence:</b><br/><img src="${r.photos[0]}" width="200" />`;
        }

        kml += `
    <Placemark>
      <name>${r.unique_id || r.resourceId || 'Camera'}</name>
      <styleUrl>#${styleId}</styleUrl>
      <description><![CDATA[${description}]]></description>
      <Point>
        <coordinates>${r.location.longitude},${r.location.latitude},0</coordinates>
      </Point>
    </Placemark>`;
      }

      kml += `
  </Document>
</kml>`;

      const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'surveillance_report.kml';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to export KML');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '32px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
      <div>
        <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 'bold' }}>START DATE</div>
        <input 
          type="date" 
          value={startDate} 
          onChange={e => setStartDate(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px', outline: 'none' }}
        />
      </div>
      <div>
        <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 'bold' }}>END DATE</div>
        <input 
          type="date" 
          value={endDate} 
          onChange={e => setEndDate(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px', outline: 'none' }}
        />
      </div>
      <button 
        onClick={handleExportPDF} 
        disabled={exporting}
        style={{ padding: '8px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: exporting ? 'not-allowed' : 'pointer' }}
      >
        {exporting ? 'EXPORTING...' : 'EXPORT PDF'}
      </button>
      <button 
        onClick={handleExportKML} 
        disabled={exporting}
        style={{ padding: '8px 20px', background: 'var(--secondary)', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: '6px', fontWeight: 'bold', cursor: exporting ? 'not-allowed' : 'pointer' }}
      >
        {exporting ? 'EXPORTING...' : 'EXPORT KML'}
      </button>
    </div>
  );
}
