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
      <h2>Performance Benchmark</h2>
      <button onClick={runBenchmark} disabled={running} className="benchmark-btn">
        {running ? 'Running Benchmark...' : 'Run Benchmark'}
      </button>

      {data && (
        <div className="benchmark-results">
          <div className="stats-row">
            <div className="stat-card">
              <span className="stat-value">{data.stats.wordCount.toLocaleString()}</span>
              <span className="stat-label">Words in Trie</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{data.stats.nodeCount.toLocaleString()}</span>
              <span className="stat-label">Trie Nodes</span>
            </div>
          </div>

          <div className="bench-table">
            <table>
              <thead>
                <tr>
                  <th>Operation</th>
                  <th>Queries</th>
                  <th>Total (ms)</th>
                  <th>Avg/Query (ms)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Exact Search</td>
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
                  <td>Fuzzy Search</td>
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
