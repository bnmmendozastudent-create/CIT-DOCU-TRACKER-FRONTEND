import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/dashboard/').then(res => setStats(res.data));
  }, []);

  const cards = [
    { label: 'Total Documents', key: 'total',     color: '#6366f1' },
    { label: 'Pending',         key: 'pending',   color: '#f59e0b' },
    { label: 'In Review',       key: 'in_review', color: '#3b82f6' },
    { label: 'Approved',        key: 'approved',  color: '#10b981' },
    { label: 'Rejected',        key: 'rejected',  color: '#ef4444' },
    { label: 'Archived',        key: 'archived',  color: '#8b5cf6' },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h2>Welcome back, {user?.first_name || user?.username}! </h2>
        <p>Here's an overview of document activity.</p>
      </div>

      {/* Encryption info banner */}
      <div className="info-banner">
        All document data is protected using <strong>IDEA (International Data Encryption Algorithm)</strong> with 128-bit keys in CBC mode.
      </div>

      {/* Stats cards */}
      <div className="stats-grid">
        {cards.map(card => (
          <div key={card.key} className="stat-card" style={{ borderTop: `4px solid ${card.color}` }}>
            <div className="stat-icon">{card.icon}</div>
            <div className="stat-value">{stats ? stats[card.key] : '...'}</div>
            <div className="stat-label">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="quick-actions">
        <Link to="/documents" className="btn btn-primary">View All Documents</Link>
        {(user?.role === 'admin' || user?.role === 'staff') &&
          <Link to="/documents?new=1" className="btn btn-success">New Document</Link>
        }
      </div>
    </div>
  );
}