import { useState } from 'react';
import { api } from '../services/api';
import type { InsertResponse } from '../types';

export default function InsertWord() {
  const [word, setWord] = useState('');
  const [result, setResult] = useState<InsertResponse | null>(null);
  const [inserting, setInserting] = useState(false);

  const handleInsert = async () => {
    if (!word.trim()) return;
    setInserting(true);
    try {
      const res = await api.insertWord(word.trim());
      setResult(res);
      setWord('');
    } catch {
      setResult(null);
    }
    setInserting(false);
  };

  return (
    <div className="insert-panel">
      <h2>Insert Word</h2>
      <div className="insert-controls">
        <input
          type="text"
          value={word}
          onChange={e => setWord(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleInsert()}
          placeholder="Enter a word to insert..."
        />
        <button onClick={handleInsert} disabled={inserting}>
          {inserting ? 'Inserting...' : 'Insert'}
        </button>
      </div>
      {result && (
        <div className={`insert-result ${result.success ? 'success' : 'error'}`}>
          {result.success
            ? `"${result.word}" inserted (frequency: ${result.frequency})`
            : 'Failed to insert word'}
        </div>
      )}
    </div>
  );
}
