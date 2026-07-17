export interface SearchResult {
  word: string;
  frequency: number;
  editDistance?: number;
}

export interface AutocompleteResponse {
  prefix: string;
  k: number;
  results: SearchResult[];
  queryTimeMs: number;
}

export interface FuzzyResponse {
  word: string;
  maxDist: number;
  results: SearchResult[];
  queryTimeMs: number;
}

export interface BenchmarkData {
  search: { queries: number; timeMs: number; avgPerQuery: string };
  autocomplete: { queries: number; timeMs: number; avgPerQuery: string };
  fuzzy: { queries: number; timeMs: number; avgPerQuery: string };
  stats: { wordCount: number; nodeCount: number };
}

export interface InsertResponse {
  success: boolean;
  word: string;
  frequency?: number;
  stats?: { wordCount: number; nodeCount: number };
}
