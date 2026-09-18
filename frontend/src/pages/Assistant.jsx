import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../i18n/translations';
import LanguageSelector from '../components/LanguageSelector';

export default function Assistant() {
  const { language } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    api.get('/assistant/history').then((res) => {
      const history = res.data.history.flatMap((h) => [
        { role: 'user', text: h.user_message },
        { role: 'ai', text: h.ai_response },
      ]);
      setMessages(history);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(e) {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setSending(true);
    try {
      const res = await api.post('/assistant/chat', { message: userMsg, language });
      setMessages((prev) => [...prev, { role: 'ai', text: res.data.response }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'ai', text: 'Sorry, something went wrong.' }]);
    } finally {
      setSending(false);
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

      <main className="chat-main">
        <h2>🤖 {t(language, 'aiAssistant')}</h2>
        <div className="chat-window">
          {messages.map((m, idx) => (
            <div key={idx} className={`chat-bubble ${m.role}`}>
              {m.text}
            </div>
          ))}
          {sending && <div className="chat-bubble ai typing">...</div>}
          <div ref={bottomRef} />
        </div>
        <form className="chat-input-row" onSubmit={sendMessage}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t(language, 'typeMessage')}
          />
          <button type="submit" className="primary-btn" disabled={sending}>
            {t(language, 'send')}
          </button>
        </form>
      </main>
    </div>
  );
}
