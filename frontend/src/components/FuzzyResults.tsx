import { useState } from 'react';
import { api } from '../services/api';
import type { SearchResult } from '../types';

export default function FuzzyResults() {
  const [query, setQuery] = useState('');
  const [maxDist, setMaxDist] = useState(1);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [queryTime, setQueryTime] = useState(0);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const data = await api.fuzzySearch(query, maxDist);
      setResults(data.results);
      setQueryTime(data.queryTimeMs);
    } catch {
      setResults([]);
    }
    setSearching(false);
  };

  return (
    <div className="fuzzy-panel">
      <p className="eyebrow">edit distance</p>
      <h2>Fuzzy Search</h2>
      <p className="panel-note">Finds words within {maxDist} edit{maxDist === 1 ? '' : 's'} of what you type.</p>
      <div className="fuzzy-controls">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Enter a misspelled word"
        />
        <div className="dist-control">
          <label>max distance</label>
          <select value={maxDist} onChange={e => setMaxDist(Number(e.target.value))}>
            <option value={0}>0 (exact)</option>
            <option value={1}>1</option>
          </select>
        </div>
        <button onClick={handleSearch} disabled={searching}>
          {searching ? 'Searching' : 'Search'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="fuzzy-results">
          <div className="results-header">
            <span>{results.length} matches</span>
            <span className="query-time">{queryTime}ms</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>word</th>
                <th>distance</th>
                <th>frequency</th>
              </tr>
            </thead>
            <tbody>
              {results.slice(0, 20).map(r => (
                <tr key={r.word} className={r.editDistance === 0 ? 'exact' : ''}>
                  <td className="word-cell">{r.word}</td>
                  <td className="dist-cell">
                    <span className={`dist-badge dist-${r.editDistance}`}>
                      {r.editDistance}
                    </span>
                  </td>
                  <td className="freq-cell">{r.frequency}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {results.length > 20 && (
            <p className="more-results">...and {results.length - 20} more</p>
          )}
        </div>
      )}
    </div>
  );
}
