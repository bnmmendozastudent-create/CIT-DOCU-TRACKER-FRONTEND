import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axiosConfig';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import DocumentForm from './DocumentForm';
import { QRCodeSVG } from 'qrcode.react';
import logo from '../assets/logo.png';

export default function DocumentDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [doc, setDoc]           = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [qrValue, setQrValue]   = useState(null);
  const [genQr, setGenQr]       = useState(false);
  const [unlockKey, setUnlockKey] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const fetchDoc = useCallback(async (keyOverride = null) => {
    const key = keyOverride ?? searchParams.get('key');
    const requestUrl = key ? `/documents/${id}/?key=${encodeURIComponent(key)}` : `/documents/${id}/`;
    const res = await api.get(requestUrl);
    setDoc(res.data);
    setQrValue(res.data.qr_code?.encoded_url || null);
  }, [id, searchParams]);

  useEffect(() => { fetchDoc(); }, [fetchDoc]);

  const handleGenerateQR = async () => {
    try {
      setGenQr(true);
      const res = await api.post(`/documents/${id}/qr/`);
      setQrValue(res.data.encoded_url);
      toast.success('QR code generated.');
      fetchDoc();
    } catch (err) {
      toast.error('Failed to generate QR code.');
    } finally {
      setGenQr(false);
    }
  };

  const getLogoBase64 = () => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = logo;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(null);
    });
  };

  // Helper: draw a full rounded rect path
  const roundRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  // Helper: rounded rect with only top corners rounded (for header bar)
  const roundRectTop = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  // Builds a canvas card identical to the print layout
  const buildQRCanvas = async () => {
    const svgEl = document.querySelector('.qr-image svg');
    if (!svgEl) return null;

    const CARD_W = 400;
    const CARD_H = 520;
    const s = 2; // retina scale
    const canvas = document.createElement('canvas');
    canvas.width = CARD_W * s;
    canvas.height = CARD_H * s;
    const ctx = canvas.getContext('2d');

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CARD_W * s, CARD_H * s);

    // Card border
    ctx.strokeStyle = '#1e1b4b';
    ctx.lineWidth = 3 * s;
    roundRect(ctx, 16 * s, 16 * s, (CARD_W - 32) * s, (CARD_H - 32) * s, 12 * s);
    ctx.stroke();

    // Dark header bar
    ctx.fillStyle = '#1e1b4b';
    roundRectTop(ctx, 16 * s, 16 * s, (CARD_W - 32) * s, 68 * s, 12 * s);
    ctx.fill();

    // Logo in header
    const logoBase64 = await getLogoBase64();
    if (logoBase64) {
      await new Promise((res) => {
        const logoImg = new Image();
        logoImg.src = logoBase64;
        logoImg.onload = () => {
          ctx.drawImage(logoImg, 28 * s, 26 * s, 44 * s, 44 * s);
          res();
        };
        logoImg.onerror = res;
      });
    }

    // Header title text
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${13 * s}px Segoe UI, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('CIT Document Tracker', 82 * s, 46 * s);
    ctx.fillStyle = '#c7d2fe';
    ctx.font = `${10 * s}px Segoe UI, sans-serif`;
    ctx.fillText('Secure · Encrypted · Trackable', 82 * s, 64 * s);

    // Render QR SVG onto canvas
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    await new Promise((res) => {
      const qrImg = new Image();
      qrImg.onload = () => {
        const qrSize = 200 * s;
        const qrX = (CARD_W * s - qrSize) / 2;
        ctx.drawImage(qrImg, qrX, 98 * s, qrSize, qrSize);
        URL.revokeObjectURL(svgUrl);
        res();
      };
      qrImg.onerror = res;
      qrImg.src = svgUrl;
    });

    // Document code pill
    ctx.fillStyle = '#eff6ff';
    roundRect(ctx, 80 * s, 312 * s, 240 * s, 30 * s, 8 * s);
    ctx.fill();
    ctx.fillStyle = '#4f46e5';
    ctx.font = `bold ${12 * s}px Courier New, monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(doc.document_code, CARD_W * s / 2, 332 * s);

    // Document title
    ctx.fillStyle = '#1e293b';
    ctx.font = `bold ${12 * s}px Segoe UI, sans-serif`;
    const title = doc.title.length > 45 ? doc.title.slice(0, 45) + '…' : doc.title;
    ctx.fillText(title, CARD_W * s / 2, 362 * s);

    // Status badge — use small fixed radius, NOT 999
    const statusColors = {
      pending: '#f59e0b', in_review: '#3b82f6', approved: '#10b981',
      rejected: '#ef4444', archived: '#8b5cf6'
    };
    const badgeW = 100 * s;
    const badgeH = 22 * s;
    const badgeX = (CARD_W * s - badgeW) / 2;
    const badgeY = 372 * s;
    ctx.fillStyle = statusColors[doc.status] || '#94a3b8';
    roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 11 * s);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${9 * s}px Segoe UI, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(doc.status.replace('_', ' ').toUpperCase(), CARD_W * s / 2, (372 + 15) * s);

    // Divider line
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1 * s;
    ctx.beginPath();
    ctx.moveTo(40 * s, 410 * s);
    ctx.lineTo((CARD_W - 40) * s, 410 * s);
    ctx.stroke();

    // Footer text
    ctx.fillStyle = '#94a3b8';
    ctx.font = `${9 * s}px Segoe UI, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Scan QR code to access this document', CARD_W * s / 2, 430 * s);
    ctx.fillText(`Generated ${new Date().toLocaleDateString()}`, CARD_W * s / 2, 448 * s);

    // Reset
    ctx.textAlign = 'left';

    return canvas;
  };

  const handleDownloadQR = async () => {
    try {
      setDownloading(true);
      const canvas = await buildQRCanvas();
      if (!canvas) { toast.error('QR code not found.'); return; }
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `qr-${doc.document_code}.png`;
      a.click();
      toast.success('QR card downloaded!');
    } catch (err) {
      toast.error('Download failed.');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrintQR = async () => {
    const svgEl = document.querySelector('.qr-image svg');
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const logoBase64 = await getLogoBase64();
    const statusColors = {
      pending: '#f59e0b', in_review: '#3b82f6', approved: '#10b981',
      rejected: '#ef4444', archived: '#8b5cf6'
    };
    const statusColor = statusColors[doc.status] || '#94a3b8';
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code — ${doc.document_code}</title>
          <style>
            @media print { @page { margin: 0; size: A4; } body { margin: 0; } }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              display: flex; align-items: center; justify-content: center;
              min-height: 100vh; background: #f1f5f9;
              font-family: 'Segoe UI', system-ui, sans-serif;
            }
            .card {
              background: #fff; border: 2.5px solid #1e1b4b;
              border-radius: 14px; width: 340px; overflow: hidden;
              box-shadow: 0 8px 32px rgba(0,0,0,0.15);
            }
            .card-header {
              background: #1e1b4b; padding: 1rem 1.25rem;
              display: flex; align-items: center; gap: .75rem;
            }
            .card-header img { width: 42px; height: 42px; object-fit: contain; }
            .header-text h2 { color: #fff; font-size: .95rem; font-weight: 700; }
            .header-text p { color: #c7d2fe; font-size: .72rem; margin-top: 2px; }
            .card-body { padding: 1.5rem 1.25rem; text-align: center; }
            .qr-wrap {
              border: 1.5px solid #e2e8f0; border-radius: 10px;
              padding: 1rem; display: inline-block; margin-bottom: 1rem; background: #fff;
            }
            .qr-wrap svg { display: block; }
            .doc-code {
              background: #eff6ff; color: #4f46e5;
              font-family: 'Courier New', monospace; font-weight: 700;
              font-size: .85rem; padding: .35rem .9rem;
              border-radius: 8px; display: inline-block; margin-bottom: .6rem;
            }
            .doc-title {
              font-size: .9rem; color: #1e293b; font-weight: 600;
              margin-bottom: .5rem; line-height: 1.4;
            }
            .status-pill {
              display: inline-block; padding: .2rem .75rem;
              border-radius: 999px; color: #fff; font-size: .72rem;
              font-weight: 700; text-transform: uppercase;
              background: ${statusColor}; margin-bottom: 1rem;
            }
            .divider { border: none; border-top: 1px solid #e2e8f0; margin-bottom: 1rem; }
            .footer-text { font-size: .72rem; color: #94a3b8; line-height: 1.7; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="card-header">
              ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" />` : ''}
              <div class="header-text">
                <h2>CIT Document Tracker</h2>
                <p>Secure · Encrypted · Trackable</p>
              </div>
            </div>
            <div class="card-body">
              <div class="qr-wrap">${svgData}</div>
              <div class="doc-code">${doc.document_code}</div>
              <div class="doc-title">${doc.title}</div>
              <span class="status-pill">${doc.status.replace('_', ' ')}</span>
              <hr class="divider" />
              <div class="footer-text">
                Scan QR code to access this document<br/>
                Generated ${new Date().toLocaleDateString()}
              </div>
            </div>
          </div>
          <script>window.onload = () => { window.print(); window.close(); }<\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleUnlock = async () => {
    try {
      setUnlockError('');
      const trimmedKey = unlockKey.trim();
      const res = await api.post(`/documents/${id}/unlock/`, { key: trimmedKey });
      setDoc(res.data);
      setUnlockKey('');
      toast.success('Document unlocked.');
      navigate(`/documents/${id}?key=${encodeURIComponent(trimmedKey)}`, { replace: true });
      await fetchDoc(trimmedKey);
    } catch (err) {
      setUnlockError(err.response?.data?.error || 'Access key invalid.');
    }
  };

  const handleUploadAttachment = async () => {
    if (!attachmentFile) { setUploadError('Select a file first.'); return; }
    try {
      setUploadingAttachment(true);
      setUploadError('');
      const formData = new FormData();
      formData.append('file', attachmentFile);
      await api.post(`/documents/${id}/attachments/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setAttachmentFile(null);
      toast.success('Attachment uploaded.');
      fetchDoc();
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Upload failed.');
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleDownloadAttachment = async (attachment) => {
    try {
      const key = searchParams.get('key');
      const url = key ? `${attachment.download_url}?key=${encodeURIComponent(key)}` : attachment.download_url;
      const res = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([res.data]);
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = attachment.original_name;
      a.click();
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      toast.error('Failed to download attachment.');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this document?')) return;
    await api.delete(`/documents/${id}/`);
    toast.success('Document deleted.');
    navigate('/documents');
  };

  if (!doc) return <div className="page"><p>Loading...</p></div>;

  return (
    <div className="page">
      <button className="btn btn-sm" onClick={() => navigate('/documents')}>← Back</button>
      <div className="doc-detail-header">
        <div>
          <h2>{doc.title}</h2>
          <code>{doc.document_code}</code>
        </div>
        <div className="doc-actions">
          {(user?.role !== 'viewer') &&
            <button className="btn btn-primary" onClick={() => setShowEdit(true)}>Edit</button>
          }
          {(user?.role !== 'viewer') &&
            <button className="btn btn-success" onClick={handleGenerateQR} disabled={genQr}>
              {genQr ? 'Generating...' : 'Generate QR'}
            </button>
          }
          {user?.role === 'admin' &&
            <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
          }
        </div>
      </div>

      {/* Document Details */}
      <div className="doc-grid">
        <div className="doc-info">
          <h3>Document Info</h3>
          <table className="info-table">
            <tbody>
              <tr><td>Status</td><td><span className="status-badge">{doc.status}</span></td></tr>
              <tr><td>Category</td><td>{doc.category}</td></tr>
              <tr><td>Created By</td><td>{doc.created_by?.username}</td></tr>
              <tr><td>Created At</td><td>{new Date(doc.created_at).toLocaleString()}</td></tr>
              <tr><td>Due Date</td><td>{doc.due_date || '—'}</td></tr>
              <tr><td>Location</td><td>{doc.location || 'Not assigned'}</td></tr>
              <tr><td>Encrypted</td><td>{doc.is_encrypted ? 'Yes' : 'No'}</td></tr>
              {doc.document_key && user?.role === 'admin' && (
                <tr><td>Access Key</td><td><code style={{color: '#0066cc', fontWeight: 'bold'}}>{doc.document_key}</code></td></tr>
              )}
            </tbody>
          </table>
          {doc.description && <>
            <h4 style={{margin: '1rem 0 .4rem'}}>Description</h4>
            <p className="doc-text">{doc.description}</p>
          </>}
          {doc.notes && <>
            <h4 style={{margin: '1rem 0 .4rem'}}>Notes</h4>
            <p className="doc-text">{doc.notes}</p>
          </>}

          <div className="attachments-panel">
            <h4>Attachments</h4>
            {doc.attachments?.length === 0 ? (
              <p>No attachments uploaded.</p>
            ) : (
              <div className="attachments-list">
                {doc.attachments.map(att => (
                  <div key={att.id} className="attachment-item">
                    <span>{att.original_name}</span>
                    <span>{att.is_encrypted ? 'Encrypted' : 'Plain'}</span>
                    {(user?.role !== 'viewer' || doc.unlocked) ? (
                      <button className="btn btn-sm" onClick={() => handleDownloadAttachment(att)}>
                        Download
                      </button>
                    ) : (
                      <span className="locked-text">Locked until document is unlocked</span>
                    )}
                  </div>
                ))}
              </div>
            )}
            {(user?.role === 'admin' || user?.role === 'staff') && (
              <div className="attachment-upload">
                <h4>Upload Attachment</h4>
                <input
                  type="file"
                  onChange={e => setAttachmentFile(e.target.files?.[0] || null)}
                />
                {uploadError && <p className="error-text">{uploadError}</p>}
                <button className="btn btn-primary" onClick={handleUploadAttachment} disabled={uploadingAttachment}>
                  {uploadingAttachment ? 'Uploading...' : 'Upload File'}
                </button>
              </div>
            )}
          </div>

          {user?.role === 'viewer' && doc.is_encrypted && !doc.unlocked && (
            <div className="unlock-panel">
              <h4>Unlock Document</h4>
              <p>Enter the access key from the QR code to reveal content.</p>
              <div className="form-group">
                <label>Access Key</label>
                <input
                  type="text"
                  value={unlockKey}
                  onChange={e => setUnlockKey(e.target.value)}
                  placeholder="Enter document access key"
                />
              </div>
              {unlockError && <p className="error-text">{unlockError}</p>}
              <button className="btn btn-primary" onClick={handleUnlock}>Unlock</button>
            </div>
          )}
        </div>

        {/* QR Code Panel */}
        <div className="qr-panel">
          <h3>QR Code</h3>
          {qrValue ? (
            <div className="qr-display">
              {/* QR Card Preview */}
              <div className="qr-card-preview">
                <div className="qr-card-header">
                  <img src={logo} alt="CIT Logo" className="qr-card-logo" />
                  <div>
                    <div className="qr-card-title">CIT Document Tracker</div>
                    <div className="qr-card-subtitle">Secure · Encrypted · Trackable</div>
                  </div>
                </div>
                <div className="qr-card-body">
                  <div className="qr-image">
                    <QRCodeSVG value={qrValue} size={170} />
                  </div>
                  <div className="qr-card-code">{doc.document_code}</div>
                  <div className="qr-card-docname">
                    {doc.title.length > 38 ? doc.title.slice(0, 38) + '…' : doc.title}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="qr-btn-group">
                <button onClick={handleDownloadQR} className="btn btn-qr-download" disabled={downloading}>
                  {downloading ? '⏳ Downloading…' : '⬇ Download PNG'}
                </button>
                <button onClick={handlePrintQR} className="btn btn-qr-print">
                  🖨 Print QR
                </button>
              </div>
            </div>
          ) : (
            <div className="qr-empty">
              <div className="qr-empty-icon">📄</div>
              <p>No QR code yet.</p>
              {user?.role !== 'viewer' &&
                <button className="btn btn-primary" style={{marginTop: '1rem'}} onClick={handleGenerateQR}>
                  Generate QR Code
                </button>
              }
            </div>
          )}
        </div>
      </div>

      {/* Audit Logs */}
      <div className="logs-section">
        <h3>Audit Trail</h3>
        <div className="logs-list">
          {doc.logs?.length === 0 && <p>No logs yet.</p>}
          {doc.logs?.map(log => (
            <div key={log.id} className="log-entry">
              <span className="log-action">{log.action.replace('_',' ')}</span>
              <span>by <strong>{log.performed_by?.username}</strong></span>
              <span className="log-time">{new Date(log.timestamp).toLocaleString()}</span>
              {log.details && <span className="log-details">{log.details}</span>}
            </div>
          ))}
        </div>
      </div>

      {showEdit && <DocumentForm existing={doc} onClose={() => { setShowEdit(false); fetchDoc(); }} />}
    </div>
  );
}