// Thin wrapper around an OpenAI-compatible Chat Completions API.
// If AI_API_KEY is not set, functions fall back to simple offline logic
// so the app still runs end-to-end without an external API key.
const fetch = require('node-fetch');

const AI_API_KEY = process.env.AI_API_KEY;
const AI_API_BASE_URL = process.env.AI_API_BASE_URL || 'https://api.openai.com/v1';
const AI_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';

const hasAI = Boolean(AI_API_KEY);

async function chatComplete(messages, { temperature = 0.6, maxTokens = 600 } = {}) {
  if (!hasAI) return null; // signal caller to use fallback

  const response = await fetch(`${AI_API_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

module.exports = { chatComplete, hasAI };
