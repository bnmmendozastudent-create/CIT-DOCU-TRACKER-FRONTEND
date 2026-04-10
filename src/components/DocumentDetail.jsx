import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axiosConfig';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import DocumentForm from './DocumentForm';
import { QRCodeSVG } from 'qrcode.react';

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

  const handleDownloadQR = () => {
    const svg = document.querySelector('.qr-image svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-document-${id}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUnlock = async () => {
    try {
      setUnlockError('');
      const trimmedKey = unlockKey.trim(); // Trim whitespace
      const res = await api.post(`/documents/${id}/unlock/`, { key: trimmedKey });
      setDoc(res.data);
      setUnlockKey('');
      toast.success('Document unlocked.');

      // Persist the access key in the URL so refresh and future fetches keep the document unlocked
      navigate(`/documents/${id}?key=${encodeURIComponent(trimmedKey)}`, { replace: true });
      await fetchDoc(trimmedKey);
    } catch (err) {
      setUnlockError(err.response?.data?.error || 'Access key invalid.');
    }
  };

  const handleUploadAttachment = async () => {
    if (!attachmentFile) {
      setUploadError('Select a file first.');
      return;
    }
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
      <button className="btn btn-sm" onClick={() => navigate('/documents')}>Back</button>
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
            <h4>Description</h4>
            <p className="doc-text">{doc.description}</p>
          </>}
          {doc.notes && <>
            <h4>Notes</h4>
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

        {/* QR Code */}
        <div className="qr-panel">
          <h3>QR Code</h3>
          {qrValue ? (
            <div className="qr-display">
              <div className="qr-image">
                <QRCodeSVG
                  value={qrValue}
                  size={200}
                />
              </div>
              <p className="qr-code">{doc.document_code}</p>
              <button onClick={handleDownloadQR} className="btn btn-sm">Download QR</button>
            </div>
          ) : (
            <div className="qr-empty">
              <p>No QR code yet.</p>
              {user?.role !== 'viewer' &&
                <button className="btn btn-primary" onClick={handleGenerateQR}>Generate QR Code</button>
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