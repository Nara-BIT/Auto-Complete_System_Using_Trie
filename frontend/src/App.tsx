import { useState } from 'react';
import SearchBar from './components/SearchBar';
import FuzzyResults from './components/FuzzyResults';
import BenchmarkPanel from './components/BenchmarkPanel';
import InsertWord from './components/InsertWord';
import StatsBar from './components/StatsBar';

type Tab = 'autocomplete' | 'fuzzy' | 'benchmark' | 'insert';

function App() {
  const [tab, setTab] = useState<Tab>('autocomplete');

  return (
    <div className="app">
      <header className="app-header">
        <div className="wordmark">
          <h1>Trie Autocomplete</h1>
          <p className="subtitle">
            Prefix search over a C++ trie, answered as you type.
          </p>
        </div>
        <StatsBar />
      </header>

      <nav className="tabs">
        {([
          ['autocomplete', 'Autocomplete'],
          ['fuzzy', 'Fuzzy Search'],
          ['insert', 'Insert Word'],
          ['benchmark', 'Benchmark'],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            className={tab === key ? 'active' : ''}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      <main className="app-main">
        {tab === 'autocomplete' && <SearchBar />}
        {tab === 'fuzzy' && <FuzzyResults />}
        {tab === 'insert' && <InsertWord />}
        {tab === 'benchmark' && <BenchmarkPanel />}
      </main>

      <footer className="app-footer">
        <p>C++ core, React frontend</p>
      </footer>
    </div>
  );
}

export default App;
