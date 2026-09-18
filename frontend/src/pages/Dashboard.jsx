import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../i18n/translations';
import LanguageSelector from '../components/LanguageSelector';

const TECHNOLOGIES = ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'Jenkins', 'Linux', 'GitHub Actions', 'Monitoring'];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { language } = useLanguage();

  return (
    <div className="page">
      <header className="topbar">
        <h1>🤖 {t(language, 'appName')}</h1>
        <div className="topbar-right">
          <LanguageSelector />
          <span className="username">👋 {user?.name}</span>
          <button className="ghost-btn" onClick={logout}>
            {t(language, 'logout')}
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <h2>{t(language, 'welcome')}, {user?.name}!</h2>

        <div className="feature-grid">
          <Link to="/interview" className="feature-card">
            <span className="feature-icon">🎤</span>
            <h3>{t(language, 'practiceInterview')}</h3>
            <p>Multilingual voice-based mock interviews with AI evaluation.</p>
          </Link>

          <Link to="/quiz" className="feature-card">
            <span className="feature-icon">❓</span>
            <h3>{t(language, 'quiz')}</h3>
            <p>Test your knowledge with quick multiple-choice quizzes.</p>
          </Link>

          <Link to="/assistant" className="feature-card">
            <span className="feature-icon">🤖</span>
            <h3>{t(language, 'aiAssistant')}</h3>
            <p>Ask DevOps questions in English, Hindi, or Marathi.</p>
          </Link>

          <Link to="/progress" className="feature-card">
            <span className="feature-icon">📊</span>
            <h3>{t(language, 'progress')}</h3>
            <p>Track your learning progress across all technologies.</p>
          </Link>
        </div>

        <section className="tech-list">
          <h3>{t(language, 'technology')}</h3>
          <div className="tech-chips">
            {TECHNOLOGIES.map((tech) => (
              <span className="chip" key={tech}>{tech}</span>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
