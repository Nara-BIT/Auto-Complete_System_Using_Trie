import { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function StatsBar() {
  const [stats, setStats] = useState({ wordCount: 0, nodeCount: 0 });
  const [engine, setEngine] = useState('unknown');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [s, h] = await Promise.all([api.stats(), api.health()]);
        setStats(s);
        setEngine(h.engine);
      } catch {
        // Server not running
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="stats-bar">
      <div className="stat">
        <span className="stat-label">words</span>
        <span className="stat-num">{stats.wordCount.toLocaleString()}</span>
      </div>
      <div className="stat">
        <span className="stat-label">nodes</span>
        <span className="stat-num">{stats.nodeCount.toLocaleString()}</span>
      </div>
      <div className="stat engine-badge">
        <span className="stat-label">engine</span>
        <span className="stat-num">{engine}</span>
      </div>
    </div>
  );
}
