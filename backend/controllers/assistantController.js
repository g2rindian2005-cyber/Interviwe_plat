const pool = require('../config/db');
const { chatComplete, hasAI } = require('../utils/aiClient');
const { LANGUAGE_INSTRUCTION, isValidLanguage } = require('../utils/languages');

const OFFLINE_NOTE = {
  en: 'AI assistant is running in offline mode. Add AI_API_KEY in backend/.env for full answers.',
  hi: 'AI असिस्टेंट ऑफलाइन मोड में चल रहा है। पूर्ण उत्तरों के लिए backend/.env में AI_API_KEY जोड़ें।',
  mr: 'AI असिस्टंट ऑफलाइन मोडमध्ये चालू आहे. संपूर्ण उत्तरांसाठी backend/.env मध्ये AI_API_KEY जोडा.',
};

exports.chat = async (req, res) => {
  try {
    const { message, language } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }
    const lang = isValidLanguage(language) ? language : 'en';

    let aiResponse;
    if (hasAI) {
      const systemPrompt = `You are a helpful DevOps AI Assistant embedded in a learning platform.
Answer questions about AWS, Docker, Kubernetes, Terraform, Jenkins, Linux, GitHub Actions, and Monitoring clearly and concisely.
${LANGUAGE_INSTRUCTION[lang]}`;

      aiResponse = await chatComplete(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        { maxTokens: 500 }
      );
    }

    if (!aiResponse) {
      aiResponse = OFFLINE_NOTE[lang];
    }

    await pool.query(
      `INSERT INTO assistant_chats (user_id, language, user_message, ai_response) VALUES ($1, $2, $3, $4)`,
      [req.user.id, lang, message, aiResponse]
    );

    res.json({ response: aiResponse });
  } catch (err) {
    console.error('Assistant chat error:', err);
    res.status(500).json({ error: 'Server error processing chat message.' });
  }
};

exports.getChatHistory = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT language, user_message, ai_response, created_at FROM assistant_chats
       WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json({ history: result.rows.reverse() });
  } catch (err) {
    console.error('Chat history error:', err);
    res.status(500).json({ error: 'Server error fetching chat history.' });
  }
};
