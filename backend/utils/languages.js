const SUPPORTED_LANGUAGES = {
  en: { name: 'English', voiceLocale: 'en-IN' },
  hi: { name: 'Hindi', voiceLocale: 'hi-IN' },
  mr: { name: 'Marathi', voiceLocale: 'mr-IN' },
};

const LANGUAGE_INSTRUCTION = {
  en: 'Respond only in English.',
  hi: 'केवल हिंदी में उत्तर दें (Respond only in Hindi, using Devanagari script).',
  mr: 'फक्त मराठीत उत्तर द्या (Respond only in Marathi, using Devanagari script).',
};

function isValidLanguage(lang) {
  return Object.prototype.hasOwnProperty.call(SUPPORTED_LANGUAGES, lang);
}

module.exports = { SUPPORTED_LANGUAGES, LANGUAGE_INSTRUCTION, isValidLanguage };
