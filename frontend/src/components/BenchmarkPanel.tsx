import { useState } from 'react';
import { api } from '../services/api';
import type { BenchmarkData } from '../types';

export default function BenchmarkPanel() {
  const [data, setData] = useState<BenchmarkData | null>(null);
  const [running, setRunning] = useState(false);

  const runBenchmark = async () => {
    setRunning(true);
    try {
      const result = await api.benchmark();
      setData(result);
    } catch {
      setData(null);
    }
    setRunning(false);
  };

  return (
    <div className="benchmark-panel">
      <p className="eyebrow">timings</p>
      <h2>Performance Benchmark</h2>
      <p className="panel-note">Runs a batch of queries against the trie and reports the average per query.</p>
      <button onClick={runBenchmark} disabled={running} className="benchmark-btn">
        {running ? 'Running' : 'Run benchmark'}
      </button>

      {data && (
        <div className="benchmark-results">
          <div className="stats-row">
            <div className="stat-card">
              <span className="stat-value">{data.stats.wordCount.toLocaleString()}</span>
              <span className="stat-label">words in trie</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{data.stats.nodeCount.toLocaleString()}</span>
              <span className="stat-label">trie nodes</span>
            </div>
          </div>

          <div className="bench-table">
            <table>
              <thead>
                <tr>
                  <th>operation</th>
                  <th>queries</th>
                  <th>total ms</th>
                  <th>avg ms</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Exact search</td>
                  <td>{data.search.queries.toLocaleString()}</td>
                  <td>{data.search.timeMs}</td>
                  <td>{data.search.avgPerQuery}</td>
                </tr>
                <tr>
                  <td>Autocomplete</td>
                  <td>{data.autocomplete.queries.toLocaleString()}</td>
                  <td>{data.autocomplete.timeMs}</td>
                  <td>{data.autocomplete.avgPerQuery}</td>
                </tr>
                <tr>
                  <td>Fuzzy search</td>
                  <td>{data.fuzzy.queries.toLocaleString()}</td>
                  <td>{data.fuzzy.timeMs}</td>
                  <td>{data.fuzzy.avgPerQuery}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
