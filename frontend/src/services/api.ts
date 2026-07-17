import type { AutocompleteResponse, FuzzyResponse, BenchmarkData, InsertResponse } from '../types';

const API_BASE = 'http://localhost:3001/api';

async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  return res.json();
}

export const api = {
  autocomplete: (prefix: string, k = 10) =>
    post<AutocompleteResponse>('/autocomplete', { prefix, k }),

  fuzzySearch: (word: string, maxDist = 1) =>
    post<FuzzyResponse>('/fuzzy', { word, maxDist }),

  insertWord: (word: string) =>
    post<InsertResponse>('/insert', { word }),

  search: (word: string) =>
    post<{ word: string; frequency: number }>('/search', { word }),

  benchmark: () => get<BenchmarkData>('/benchmark'),

  stats: () => get<{ wordCount: number; nodeCount: number }>('/stats'),

  health: () => get<{ status: string; engine: string }>('/health'),
};
