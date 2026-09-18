import { useLanguage } from '../context/LanguageContext';

export default function LanguageSelector() {
  const { language, setLanguage, LANGUAGES } = useLanguage();

  return (
    <select
      className="lang-selector"
      value={language}
      onChange={(e) => setLanguage(e.target.value)}
      aria-label="Select Language"
    >
      {LANGUAGES.map((l) => (
        <option key={l.code} value={l.code}>
          {l.flag} {l.label}
        </option>
      ))}
    </select>
  );
}
