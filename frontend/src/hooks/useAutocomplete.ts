import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';
import type { SearchResult } from '../types';

export function useAutocomplete(debounceMs = 150) {
  const [prefix, setPrefix] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [queryTimeMs, setQueryTimeMs] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    try {
      const data = await api.autocomplete(query, 10);
      setResults(data.results);
      setQueryTimeMs(data.queryTimeMs);
    } catch {
      setResults([]);
    }
    setLoading(false);
  }, []);

  const updatePrefix = useCallback((value: string) => {
    setPrefix(value);
    setLoading(true);
    if (timerRef.current) clearTimeout(timerRef.current as ReturnType<typeof setTimeout>);
    timerRef.current = setTimeout(() => fetchSuggestions(value), debounceMs);
  }, [fetchSuggestions, debounceMs]);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return { prefix, updatePrefix, results, loading, queryTimeMs };
}
