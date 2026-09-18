import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../i18n/translations';
import LanguageSelector from '../components/LanguageSelector';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { register, loading } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await register(name, email, password, language);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
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
        <h2>{t(language, 'register')}</h2>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={handleSubmit}>
          <label>{t(language, 'name')}</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          <label>{t(language, 'email')}</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label>{t(language, 'password')}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? '...' : t(language, 'register')}
          </button>
        </form>
        <p className="switch-link">
          Already have an account? <Link to="/login">{t(language, 'login')}</Link>
        </p>
      </div>
    </div>
  );
}
