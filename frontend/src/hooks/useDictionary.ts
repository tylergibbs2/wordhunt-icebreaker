import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { dictionaryApi } from '../api/dictionary';
import { TrieNode } from '../lib/TrieNode';

const DICTIONARY_VERSION_KEY = 'dictionary_version';
const DICTIONARY_DATA_KEY = 'dictionary_data';
const TRIE_DATA_KEY = 'trie_data';

// Helper function to build trie from word list
const buildTrie = (words: string[]): TrieNode => {
  const trie = new TrieNode();
  for (const word of words) {
    trie.insert(word);
  }
  return trie;
};

// Query keys
export const dictionaryKeys = {
  all: ['dictionary'] as const,
  version: () => [...dictionaryKeys.all, 'version'] as const,
  words: (version: number) =>
    [...dictionaryKeys.all, 'words', version] as const,
};

export const useDictionary = () => {
  const queryClient = useQueryClient();

  // Check localStorage for cached version and data
  const getCachedData = () => {
    try {
      const cachedVersion = localStorage.getItem(DICTIONARY_VERSION_KEY);
      const cachedWords = localStorage.getItem(DICTIONARY_DATA_KEY);

      if (cachedVersion && cachedWords) {
        return {
          version: parseInt(cachedVersion, 10),
          words: JSON.parse(cachedWords),
        };
      }
    } catch {
      // Ignore localStorage errors
    }
    return null;
  };

  const cachedData = getCachedData();

  // Query for dictionary version
  const versionQuery = useQuery({
    queryKey: dictionaryKeys.version(),
    queryFn: dictionaryApi.getVersion,
    staleTime: 5 * 60 * 1000, // 5 minutes
    initialData: cachedData?.version, // Use cached version as initial data
  });

  // Query for dictionary words (only runs when version is different from cache)
  const wordsQuery = useQuery({
    queryKey: dictionaryKeys.words(versionQuery.data || 0),
    queryFn: dictionaryApi.getDictionary,
    enabled: !!versionQuery.data && versionQuery.data !== cachedData?.version,
    staleTime: Infinity, // Never stale since we check version separately
    gcTime: Infinity, // Keep in cache indefinitely
    initialData: cachedData?.words, // Use cached words if version matches
    select: data => {
      // Store in localStorage for persistence
      if (versionQuery.data) {
        localStorage.setItem(
          DICTIONARY_VERSION_KEY,
          versionQuery.data.toString()
        );
        localStorage.setItem(DICTIONARY_DATA_KEY, JSON.stringify(data));
      }
      return data;
    },
  });

  const clearCache = () => {
    localStorage.removeItem(DICTIONARY_VERSION_KEY);
    localStorage.removeItem(DICTIONARY_DATA_KEY);
    localStorage.removeItem(TRIE_DATA_KEY);
    queryClient.removeQueries({ queryKey: dictionaryKeys.all });
  };

  const reload = () => {
    queryClient.invalidateQueries({ queryKey: dictionaryKeys.all });
  };

  // Build trie from current words data (memoized to prevent rebuilds)
  const trie = useMemo(() => {
    if (!wordsQuery.data) return new TrieNode();

    console.log('Building trie from', wordsQuery.data.length, 'words...');
    const startTime = performance.now();
    const builtTrie = buildTrie(wordsQuery.data);
    const endTime = performance.now();
    console.log(
      `Trie built successfully in ${(endTime - startTime).toFixed(2)}ms`
    );

    return builtTrie;
  }, [wordsQuery.data?.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Use cached data if available and version matches, otherwise use query data
  const words = wordsQuery.data || cachedData?.words || [];
  const isLoading =
    versionQuery.isLoading || (wordsQuery.isLoading && !cachedData?.words);

  return {
    words,
    trie,
    isLoading,
    error: versionQuery.error || wordsQuery.error,
    version: versionQuery.data || cachedData?.version || null,
    reload,
    clearCache,
    // Trie utility functions
    isWord: (word: string) => trie.search(word),
    isPrefix: (prefix: string) => trie.startsWith(prefix),
    getWordsWithPrefix: (prefix: string) => trie.getWordsWithPrefix(prefix),
    getNextCharacters: (path: string) => trie.getNextCharacters(path),
  };
};
