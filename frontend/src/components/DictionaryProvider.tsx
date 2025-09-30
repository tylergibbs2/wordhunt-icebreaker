import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useDictionary } from '../hooks/useDictionary';
import { TrieNode } from '../lib/TrieNode';

/* eslint-disable react-refresh/only-export-components */

interface DictionaryContextType {
  words: string[];
  trie: TrieNode;
  isLoading: boolean;
  error: Error | null;
  version: number | null;
  reload: () => void;
  clearCache: () => void;
  // Trie utility functions
  isWord: (word: string) => boolean;
  isPrefix: (prefix: string) => boolean;
  getWordsWithPrefix: (prefix: string) => string[];
  getNextCharacters: (path: string) => string[];
}

const DictionaryContext = createContext<DictionaryContextType | undefined>(
  undefined
);

interface DictionaryProviderProps {
  children: ReactNode;
}

export const DictionaryProvider: React.FC<DictionaryProviderProps> = ({
  children,
}) => {
  const dictionary = useDictionary();

  return (
    <DictionaryContext.Provider value={dictionary}>
      {children}
    </DictionaryContext.Provider>
  );
};

export const useDictionaryContext = (): DictionaryContextType => {
  const context = useContext(DictionaryContext);
  if (context === undefined) {
    throw new Error(
      'useDictionaryContext must be used within a DictionaryProvider'
    );
  }
  return context;
};
