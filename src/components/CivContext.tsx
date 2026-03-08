import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { Civilization, Unit } from '../data/aoe4Data';
import { useCivilizations } from '../hooks/useCivilizations';
import { unitsList } from '../data/aoe4Data';

interface CivDataContextType {
  civilizations: Civilization[];
  globalUnits: Unit[];
  loading: boolean;
  error: string | null;
  refreshCivs: () => void;
}

const CivDataContext = createContext<CivDataContextType | undefined>(undefined);

export function CivDataProvider({ children }: { children: ReactNode }) {
  const { civs, loading, error, refreshCivs } = useCivilizations();

  return (
    <CivDataContext.Provider value={{
      civilizations: civs,
      globalUnits: unitsList,
      loading,
      error,
      refreshCivs
    }}>
      {children}
    </CivDataContext.Provider>
  );
}

export function useCivData() {
  const context = useContext(CivDataContext);
  if (context === undefined) {
    throw new Error('useCivData must be used within a CivDataProvider');
  }
  return context;
}
