import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../i18n/translations';
import LanguageSelector from '../components/LanguageSelector';

const TECHNOLOGIES = ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'Jenkins', 'Linux', 'GitHub Actions', 'Monitoring'];

export default function Quiz() {
  const { language } = useLanguage();
  const [technology, setTechnology] = useState('Docker');
  const [stage, setStage] = useState('setup'); // setup | active | result
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function startQuiz() {
    setError('');
    try {
      const res = await api.get(`/quiz/${technology}`);
      setQuestions(res.data.questions);
      setAnswers({});
      setStage('active');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load quiz.');
    }
  }

  function selectAnswer(qId, optionIdx) {
    setAnswers((prev) => ({ ...prev, [qId]: optionIdx }));
  }

  async function submitQuiz() {
    setError('');
    try {
      const payload = {
        technology,
        language,
        answers: Object.entries(answers).map(([id, selected]) => ({ id: Number(id), selected })),
      };
      const res = await api.post('/quiz/submit', payload);
      setResult(res.data);
      setStage('result');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit quiz.');
    }
  }

  return (
    <div className="page">
      <header className="topbar">
        <Link to="/dashboard" className="back-link">← {t(language, 'dashboard')}</Link>
        <div className="topbar-right">
          <LanguageSelector />
        </div>
      </header>

      <main className="interview-main">
        {error && <div className="error-banner">{error}</div>}

        {stage === 'setup' && (
          <div className="setup-card">
            <h2>❓ {t(language, 'quiz')}</h2>
            <label>{t(language, 'technology')}</label>
            <select value={technology} onChange={(e) => setTechnology(e.target.value)}>
              {TECHNOLOGIES.map((tech) => (
                <option key={tech} value={tech}>{tech}</option>
              ))}
            </select>
            <button className="primary-btn" onClick={startQuiz}>Start Quiz</button>
          </div>
        )}

        {stage === 'active' && (
          <div className="interview-card">
            <h2>{technology} Quiz</h2>
            {questions.map((q) => (
              <div className="quiz-question" key={q.id}>
                <p><strong>{q.id + 1}. {q.question}</strong></p>
                <div className="quiz-options">
                  {q.options.map((opt, idx) => (
                    <label key={idx} className={`quiz-option ${answers[q.id] === idx ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        checked={answers[q.id] === idx}
                        onChange={() => selectAnswer(q.id, idx)}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <button
              className="primary-btn"
              onClick={submitQuiz}
              disabled={Object.keys(answers).length < questions.length}
            >
              {t(language, 'submitAnswer')}
            </button>
          </div>
        )}

        {stage === 'result' && result && (
          <div className="report-card">
            <h2>📊 Quiz Result</h2>
            <p>{result.correct} / {result.total} correct</p>
            <div className="score-item overall">
              <span>{t(language, 'overallScore')}</span>
              <strong>{result.score}%</strong>
            </div>
            <button className="primary-btn" onClick={() => setStage('setup')}>Take Another Quiz</button>
          </div>
        )}
      </main>
    </div>
  );
}
