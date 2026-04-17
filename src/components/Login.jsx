import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axiosConfig';
import logo from '../assets/logo.png';

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [tab,  setTab]  = useState('login');   // 'login' or 'register'
  const [form, setForm] = useState({ username:'', password:'', first_name:'', last_name:'', email:'', role:'viewer' });
  const [loading, setLoading] = useState(false);

  const handle = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.username, form.password);
      toast.success('Logged in successfully!');
      navigate('/');
    } catch {
      toast.error('Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/register/', form, { headers: { Authorization: undefined } });
      toast.success('Account created! Please log in.');
      setTab('login');
    } catch (err) {
      toast.error(err.response?.data?.username?.[0] || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Logo / Header */}
        <div className="login-header">
          <div className="login-logo">
            <img src={logo} alt="CIT Logo" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
          </div>
          <h1>CIT Document Tracker</h1>
          <p>Secure, encrypted, and trackable</p>
        </div>

        {/* Tab switcher */}
        <div className="login-tabs">
          <button className={tab==='login' ? 'active':''} onClick={()=>setTab('login')}>Login</button>
          <button className={tab==='register' ? 'active':''} onClick={()=>setTab('register')}>Register</button>
        </div>

        {/* Login Form */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label>Username</label>
              <input name="username" value={form.username} onChange={handle} required placeholder="Enter username" />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input name="password" type="password" value={form.password} onChange={handle} required placeholder="Enter password" />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        )}

        {/* Register Form */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="login-form">
            <div className="form-row">
              <div className="form-group">
                <label>First Name</label>
                <input name="first_name" value={form.first_name} onChange={handle} placeholder="First name" />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input name="last_name" value={form.last_name} onChange={handle} placeholder="Last name" />
              </div>
            </div>
            <div className="form-group">
              <label>Username</label>
              <input name="username" value={form.username} onChange={handle} required placeholder="Choose a username" />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input name="email" type="email" value={form.email} onChange={handle} placeholder="Email address" />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input name="password" type="password" value={form.password} onChange={handle} required placeholder="Min 6 characters" />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}