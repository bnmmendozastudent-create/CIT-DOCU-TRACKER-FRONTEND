import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import DocumentForm from './DocumentForm';

export default function DocumentList() {
  const { user } = useAuth();
  const [docs, setDocs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchParams] = useSearchParams();

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    const params = statusFilter ? `?status=${statusFilter}` : '';
    const res = await api.get(`/documents/${params}`);
    setDocs(res.data);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    if (searchParams.get('new') === '1') setShowForm(true);
    fetchDocs();
  }, [fetchDocs, searchParams]);

  const STATUS_COLORS = {
    pending: '#f59e0b', in_review: '#3b82f6', approved: '#10b981',
    rejected: '#ef4444', archived: '#8b5cf6'
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Documents</h2>
        {(user?.role !== 'viewer') &&
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>New Document</button>
        }
      </div>

      {/* Filters */}
      <div className="filters">
        {['','pending','in_review','approved','rejected','archived'].map(s => (
          <button key={s} className={`filter-btn ${statusFilter===s?'active':''}`}
            onClick={() => setStatusFilter(s)}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Document Form Modal */}
      {showForm && (
        <DocumentForm onClose={() => { setShowForm(false); fetchDocs(); }} />
      )}

      {/* Document Table */}
      {loading ? <p>Loading documents...</p> : (
        <div className="table-wrapper">
          <table className="doc-table">
            <thead>
              <tr>
                <th>Code</th><th>Title</th><th>Category</th>
                <th>Status</th><th>Created By</th><th>Date</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {docs.length === 0 && (
                <tr><td colSpan="7" style={{textAlign:'center',padding:'2rem'}}>No documents found.</td></tr>
              )}
              {docs.map(doc => (
                <tr key={doc.id}>
                  <td><code>{doc.document_code}</code></td>
                  <td>{doc.title}</td>
                  <td>{doc.category}</td>
                  <td>
                    <span className="status-badge" style={{ background: STATUS_COLORS[doc.status] }}>
                      {doc.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>{doc.created_by?.username}</td>
                  <td>{new Date(doc.created_at).toLocaleDateString()}</td>
                  <td>
                    <Link to={`/documents/${doc.id}`} className="btn btn-sm">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}