"use client"

import { createContext, useState, useContext, ReactNode } from 'react';
import { Profile } from '@/lib/types';

// This will now be the single source of truth for a candidate's shape.
interface Candidate extends Profile {
  // We can add any additional frontend-only fields here if needed later.
}


interface SearchContextType {
  candidates: Candidate[];
  setCandidates: (candidates: Candidate[]) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const SearchProvider = ({ children }: { children: ReactNode }) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  return (
    <SearchContext.Provider value={{ candidates, setCandidates }}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}; 