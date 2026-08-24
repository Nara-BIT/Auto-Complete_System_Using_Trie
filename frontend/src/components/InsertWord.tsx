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
      <p className="eyebrow">write path</p>
      <h2>Insert Word</h2>
      <p className="panel-note">Adds a word to the live trie. It becomes searchable straight away.</p>
      <div className="insert-controls">
        <input
          type="text"
          value={word}
          onChange={e => setWord(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleInsert()}
          placeholder="Word to insert"
        />
        <button onClick={handleInsert} disabled={inserting}>
          {inserting ? 'Inserting' : 'Insert word'}
        </button>
      </div>
      {result && (
        <div className={`insert-result ${result.success ? 'success' : 'error'}`}>
          {result.success
            ? `Added "${result.word}" — frequency ${result.frequency}`
            : 'That word could not be added. Check it contains only letters, then try again.'}
        </div>
      )}
    </div>
  );
}
