import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../i18n/translations';
import LanguageSelector from '../components/LanguageSelector';

export default function Progress() {
  const { language } = useLanguage();
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/progress').then((res) => setProgress(res.data.progress)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <header className="topbar">
        <Link to="/dashboard" className="back-link">← {t(language, 'dashboard')}</Link>
        <div className="topbar-right">
          <LanguageSelector />
        </div>
      </header>

      <main className="interview-main">
        <h2>📊 {t(language, 'progress')}</h2>
        {loading && <p>Loading...</p>}
        {!loading && progress.length === 0 && (
          <p>No activity yet. Start an interview or quiz to see your progress here.</p>
        )}
        <div className="progress-grid">
          {progress.map((p) => (
            <div className="progress-card" key={p.technology}>
              <h3>{p.technology}</h3>
              <p>Topics: {p.topics_completed}/{p.total_topics}</p>
              <p>Quizzes taken: {p.quizzes_taken}</p>
              <p>Interviews taken: {p.interviews_taken}</p>
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${p.avg_score}%` }} />
              </div>
              <p className="avg-score">Avg score: {p.avg_score}%</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
