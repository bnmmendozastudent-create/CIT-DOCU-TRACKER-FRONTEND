import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleBadge = { admin: 'Admin', staff: 'Staff', viewer: 'Viewer' };

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <Link to="/">CIT Document Tracker</Link>
      </div>
      <div className="nav-links">
        <Link to="/">Dashboard</Link>
        <Link to="/documents">Documents</Link>
      </div>
      <div className="nav-user">
        <span className="role-badge">{roleBadge[user?.role] || user?.role}</span>
        <span>{user?.username}</span>
        <button onClick={handleLogout} className="btn btn-sm">Logout</button>
      </div>
    </nav>
  );
}