import { useState } from 'react';
import { useAutocomplete } from '../hooks/useAutocomplete';

export default function SearchBar() {
  const { prefix, updatePrefix, results, loading, queryTimeMs } = useAutocomplete(150);
  const [selected, setSelected] = useState(-1);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected(s => Math.min(s + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected(s => Math.max(s - 1, -1));
    } else if (e.key === 'Enter' && selected >= 0) {
      updatePrefix(results[selected].word);
      setSelected(-1);
    }
  };

  return (
    <div className="search-container">
      <div className="search-bar">
        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={prefix}
          onChange={e => { updatePrefix(e.target.value); setSelected(-1); }}
          onKeyDown={handleKeyDown}
          placeholder="Type to search... (e.g., 'app', 'ban', 'chr')"
          autoFocus
        />
        {loading && <span className="spinner" />}
      </div>

      {results.length > 0 && (
        <div className="results-panel">
          <div className="results-header">
            <span>{results.length} suggestions</span>
            <span className="query-time">{queryTimeMs}ms</span>
          </div>
          <ul className="suggestions-list">
            {results.map((r, i) => (
              <li
                key={r.word}
                className={i === selected ? 'selected' : ''}
                onClick={() => { updatePrefix(r.word); setSelected(-1); }}
              >
                <span className="suggestion-word">
                  <span className="prefix-match">{prefix}</span>
                  {r.word.slice(prefix.length)}
                </span>
                <span className="frequency-badge" title="Search frequency">
                  {r.frequency}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {prefix && results.length === 0 && !loading && (
        <div className="results-panel empty">
          <span>No results for "{prefix}"</span>
        </div>
      )}
    </div>
  );
}
