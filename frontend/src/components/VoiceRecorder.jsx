import { useState, useRef, useEffect, useCallback } from 'react';

// Uses the browser's built-in Web Speech API:
// - SpeechSynthesis for Text-to-Speech (AI question playback)
// - SpeechRecognition (webkitSpeechRecognition) for Speech-to-Text (candidate answer)
// Supported in Chrome/Edge. No external API key or cost required.
// voiceLocale examples: en-IN, hi-IN, mr-IN

export function speak(text, voiceLocale, onEnd) {
  if (!('speechSynthesis' in window)) {
    if (onEnd) onEnd();
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voiceLocale;
  utterance.rate = 0.95;
  if (onEnd) utterance.onend = onEnd;
  window.speechSynthesis.speak(utterance);
}

export default function VoiceRecorder({ voiceLocale, onTranscript, disabled }) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [interim, setInterim] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = voiceLocale || 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += transcript;
        else interimText += transcript;
      }
      setInterim(interimText);
      if (finalText) {
        onTranscript(finalText.trim());
        setInterim('');
      }
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceLocale]);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      recognitionRef.current.start();
      setListening(true);
    }
  }, [listening]);

  if (!supported) {
    return (
      <p className="voice-unsupported">
        🎤 Voice input isn't supported in this browser. Please use Chrome/Edge, or type your answer instead.
      </p>
    );
  }

  return (
    <div className="voice-recorder">
      <button
        type="button"
        className={`mic-btn ${listening ? 'listening' : ''}`}
        onClick={toggleListening}
        disabled={disabled}
      >
        {listening ? '🔴 Listening...' : '🎤 Speak Answer'}
      </button>
      {interim && <p className="interim-text">{interim}</p>}
    </div>
  );
}
