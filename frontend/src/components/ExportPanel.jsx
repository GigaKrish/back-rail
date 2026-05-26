import { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { CAMERA_TYPES, CAM_CONFIG, formatDate, mToCm } from '../config';

export default function ExportPanel({ reports }) {
  const [exporting, setExporting] = useState(false);

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      const data = reports || [];
      
      const doc = new jsPDF('p', 'mm', 'a4');
      doc.setFontSize(18);
      doc.text('CCTV Surveillance Report', 14, 22);
      
      doc.setFontSize(11);
      doc.text(`Total Records: ${data.length}`, 14, 30);

      let currentY = 40;

      // 1. Capture Summary Table
      const summaryEl = document.querySelector('.summary-table');
      if (summaryEl) {
        try {
          const canvas = await html2canvas(summaryEl, { scale: 2, useCORS: true });
          if (canvas.width > 0 && canvas.height > 0) {
            const imgData = canvas.toDataURL('image/png');
            const pdfWidth = doc.internal.pageSize.getWidth() - 28;
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            doc.addImage(imgData, 'PNG', 14, currentY, pdfWidth, pdfHeight);
            currentY += pdfHeight + 15;
          }
        } catch (e) {
          console.warn('Failed to capture summary table', e);
        }
      }

      for (const type of CAMERA_TYPES) {
        const typeData = data.filter(r => r.cameraType === type);
        if (typeData.length === 0) continue;

        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(14);
        doc.text(`Camera Type: ${type} (${typeData.length} records)`, 14, currentY);
        currentY += 6;

        const tableData = typeData.map(r => {
          const { date, time } = formatDate(r.createdAt);
          const link = r.photos?.[0] ? r.photos[0] : 'No Image';
          return [
            r.unique_id || '-',
            r.resourceId || '-',
            `${r.location?.latitude || '-'}, ${r.location?.longitude || '-'}`,
            `±${mToCm(r.accuracy ?? 0)} cm`,
            `${date} ${time}`,
            r.remark || '-',
            link !== 'No Image' ? 'View Evidence' : 'No Image',
            link // hidden column for URL
          ];
        });

        autoTable(doc, {
          startY: currentY,
          head: [['UID', 'Resource ID', 'Coordinates', 'Control Value', 'Date/Time', 'Remark', 'Evidence']],
          body: tableData,
          theme: 'grid',
          styles: { fontSize: 8 },
          columnStyles: {
            6: { textColor: [0, 102, 204], fontStyle: 'bold' }
          },
          didDrawCell: (data) => {
             if (data.section === 'body' && data.column.index === 6) {
                const url = data.row.raw[7];
                if (url && url !== 'No Image') {
                  doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url: url });
                }
             }
          }
        });

        currentY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 14 : currentY + 14;
      }

      // 2. Capture Map View
      const mapEl = document.querySelector('.leaflet-container');
      if (mapEl) {
        try {
          doc.addPage();
          doc.setFontSize(14);
          doc.text('Map View Snapshot', 14, 20);
          const canvas = await html2canvas(mapEl, { scale: 2, useCORS: true });
          if (canvas.width > 0 && canvas.height > 0) {
            const imgData = canvas.toDataURL('image/png');
            const pdfWidth = doc.internal.pageSize.getWidth() - 28;
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            doc.addImage(imgData, 'PNG', 14, 25, pdfWidth, Math.min(pdfHeight, 250));
          }
        } catch (e) {
          console.warn('Failed to capture map', e);
        }
      }

      doc.save('surveillance_report.pdf');
    } catch (err) {
      console.error(err);
      alert('Failed to export PDF: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleExportKML = async () => {
    try {
      setExporting(true);
      const data = reports || [];
      
      let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Surveillance Report</name>
    <description>Exported CCTV Surveillance Data</description>
`;

      const origin = window.location.origin;

      for (const type of CAMERA_TYPES) {
        const iconKey = CAM_CONFIG[type].key;
        kml += `
    <Style id="style_${type.replace(/\s+/g, '_')}">
      <IconStyle>
        <scale>1.1</scale>
        <Icon>
          <href>${origin}/${iconKey}.png</href>
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
          <b>Latitude:</b> ${r.location?.latitude || '-'}<br/>
          <b>Longitude:</b> ${r.location?.longitude || '-'}<br/>
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
      alert('Failed to export KML: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <button 
        onClick={handleExportPDF} 
        disabled={exporting}
        style={{ padding: '8px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', cursor: exporting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
        {exporting ? 'GENERATING...' : 'EXPORT PDF'}
      </button>
      <button 
        onClick={handleExportKML} 
        disabled={exporting}
        style={{ padding: '8px 20px', background: '#fff', color: 'var(--accent)', border: '1px solid var(--border)', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', cursor: exporting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>
        {exporting ? 'GENERATING...' : 'EXPORT KML'}
      </button>
    </div>
  );
}
