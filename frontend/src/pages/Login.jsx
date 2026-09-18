import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../i18n/translations';
import LanguageSelector from '../components/LanguageSelector';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-top">
          <h1>🤖 {t(language, 'appName')}</h1>
          <LanguageSelector />
        </div>
        <p className="tagline">{t(language, 'tagline')}</p>
        <h2>{t(language, 'login')}</h2>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={handleSubmit}>
          <label>{t(language, 'email')}</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label>{t(language, 'password')}</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit" disabled={loading}>
            {loading ? '...' : t(language, 'login')}
          </button>
        </form>
        <p className="switch-link">
          Don't have an account? <Link to="/register">{t(language, 'register')}</Link>
        </p>
      </div>
    </div>
  );
}
