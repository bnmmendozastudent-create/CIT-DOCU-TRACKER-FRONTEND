import React, { useState } from 'react';
import api from '../api/axiosConfig';
import toast from 'react-hot-toast';

export default function DocumentForm({ onClose, existing }) {
  const [form, setForm] = useState(existing || {
    title: '', category: 'other', description: '', notes: '', status: 'pending', due_date: '', location: ''
  });
  const [loading, setLoading] = useState(false);
  const handle = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
      };

      if (existing) {
        await api.put(`/documents/${existing.id}/`, payload);
        toast.success('Document updated!');
      } else {
        await api.post('/documents/', payload);
        toast.success('Document created!');
      }
      onClose();
    } catch (err) {
      toast.error('Failed to save document.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>{existing ? 'Edit Document' : 'New Document'}</h3>
          <button onClick={onClose} className="close-btn">Close</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title *</label>
            <input name="title" value={form.title} onChange={handle} required placeholder="Document title" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select name="category" value={form.category} onChange={handle}>
                {['memo','report','request','certificate','letter','form','other'].map(c =>
                  <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>
                )}
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select name="status" value={form.status} onChange={handle}>
                {['pending','in_review','approved','rejected','archived'].map(s =>
                  <option key={s} value={s}>{s.replace('_',' ')}</option>
                )}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea name="description" value={form.description} onChange={handle}
              placeholder="Document description" rows={3} />
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea name="notes" value={form.notes} onChange={handle}
              placeholder="Internal notes" rows={2} />
          </div>
          <div className="form-group">
            <label>Location</label>
            <input name="location" value={form.location || ''} onChange={handle} placeholder="Current file location or department" />
          </div>
          <div className="form-group">
            <label>Due Date</label>
            <input name="due_date" type="date" value={form.due_date || ''} onChange={handle} />
          </div>
          <p className="encrypt-note">Title, description, notes, and location are encrypted on the backend.</p>
          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : (existing ? 'Update' : 'Create Document')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}