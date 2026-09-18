import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../i18n/translations';
import LanguageSelector from '../components/LanguageSelector';
import VoiceRecorder, { speak } from '../components/VoiceRecorder';

const TECHNOLOGIES = ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'Jenkins', 'Linux', 'GitHub Actions', 'Monitoring'];
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];

export default function Interview() {
  const { language, current } = useLanguage();
  const [stage, setStage] = useState('setup'); // setup | active | complete
  const [technology, setTechnology] = useState('Docker');
  const [difficulty, setDifficulty] = useState('beginner');
  const [interviewType, setInterviewType] = useState('voice');

  const [interviewId, setInterviewId] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [question, setQuestion] = useState('');
  const [voiceLocale, setVoiceLocale] = useState('en-IN');
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastFeedback, setLastFeedback] = useState(null);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  async function startInterview() {
    setError('');
    try {
      const res = await api.post('/interview/start', { technology, language, difficulty, interviewType });
      setInterviewId(res.data.interviewId);
      setQuestionNumber(res.data.questionNumber);
      setQuestion(res.data.question);
      setVoiceLocale(res.data.voiceLocale);
      setStage('active');
      setLastFeedback(null);
      setAnswer('');
      if (interviewType === 'voice') {
        setTimeout(() => speak(res.data.question, res.data.voiceLocale), 300);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start interview.');
    }
  }

  async function submitAnswer() {
    if (!answer.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post('/interview/answer', {
        interviewId,
        questionNumber,
        answerText: answer,
      });
      setLastFeedback(res.data.evaluation);

      if (res.data.interviewComplete) {
        const reportRes = await api.get(`/interview/report/${interviewId}`);
        setReport(reportRes.data);
        setStage('complete');
      } else {
        setTimeout(() => {
          setQuestionNumber(res.data.nextQuestion.questionNumber);
          setQuestion(res.data.nextQuestion.question);
          setAnswer('');
          setLastFeedback(null);
          if (interviewType === 'voice') {
            speak(res.data.nextQuestion.question, voiceLocale);
          }
        }, 1800);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit answer.');
    } finally {
      setSubmitting(false);
    }
  }

  function replayQuestion() {
    speak(question, voiceLocale);
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
            <h2>🎤 {t(language, 'practiceInterview')}</h2>

            <label>{t(language, 'technology')}</label>
            <select value={technology} onChange={(e) => setTechnology(e.target.value)}>
              {TECHNOLOGIES.map((tItem) => (
                <option key={tItem} value={tItem}>{tItem}</option>
              ))}
            </select>

            <label>{t(language, 'difficulty')}</label>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <label>{t(language, 'interviewType')}</label>
            <select value={interviewType} onChange={(e) => setInterviewType(e.target.value)}>
              <option value="voice">Voice</option>
              <option value="text">Text</option>
            </select>

            <button className="primary-btn" onClick={startInterview}>
              {t(language, 'startInterview')}
            </button>
          </div>
        )}

        {stage === 'active' && (
          <div className="interview-card">
            <div className="q-progress">Question {questionNumber} / 10</div>
            <div className="ai-question">
              <span className="badge">🤖 AI</span>
              <p>{question}</p>
              {interviewType === 'voice' && (
                <button className="ghost-btn small" onClick={replayQuestion}>🔊 Replay</button>
              )}
            </div>

            {interviewType === 'voice' ? (
              <VoiceRecorder
                voiceLocale={voiceLocale}
                disabled={submitting}
                onTranscript={(text) => setAnswer((prev) => (prev ? prev + ' ' + text : text))}
              />
            ) : null}

            <textarea
              className="answer-box"
              rows={4}
              placeholder="Your answer will appear here (or type it directly)..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />

            <button className="primary-btn" onClick={submitAnswer} disabled={submitting || !answer.trim()}>
              {submitting ? '...' : t(language, 'submitAnswer')}
            </button>

            {lastFeedback && (
              <div className="feedback-box">
                <p><strong>Technical:</strong> {lastFeedback.technical}% | <strong>Communication:</strong> {lastFeedback.communication}% | <strong>Confidence:</strong> {lastFeedback.confidence}%</p>
                <p className="feedback-text">{lastFeedback.feedback}</p>
              </div>
            )}
          </div>
        )}

        {stage === 'complete' && report && (
          <div className="report-card">
            <h2>📊 Interview Report</h2>
            <p><strong>{t(language, 'technology')}:</strong> {report.interview.technology}</p>
            <p><strong>Language:</strong> {current.label}</p>
            <p><strong>Questions:</strong> {report.interview.total_questions}</p>
            <div className="score-grid">
              <div className="score-item"><span>{t(language, 'technicalScore')}</span><strong>{report.interview.technical_score}%</strong></div>
              <div className="score-item"><span>{t(language, 'communicationScore')}</span><strong>{report.interview.communication_score}%</strong></div>
              <div className="score-item"><span>{t(language, 'confidenceScore')}</span><strong>{report.interview.confidence_score}%</strong></div>
              <div className="score-item overall"><span>{t(language, 'overallScore')}</span><strong>{report.interview.overall_score}%</strong></div>
            </div>

            <h3>Question Breakdown</h3>
            {report.questions.map((q) => (
              <div className="qa-item" key={q.question_number}>
                <p><strong>Q{q.question_number}:</strong> {q.question_text}</p>
                <p className="answer-text">{q.answer_text}</p>
                <p className="feedback-text">💬 {q.ai_feedback} (Score: {q.score}%)</p>
              </div>
            ))}

            <button className="primary-btn" onClick={() => setStage('setup')}>Start New Interview</button>
          </div>
        )}
      </main>
    </div>
  );
}
