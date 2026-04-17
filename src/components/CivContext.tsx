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
  updateCivLocally: (civ: Civilization) => void;
  updateGlobalUnitLocally: (gu: Unit) => void;
}

const CivDataContext = createContext<CivDataContextType | undefined>(undefined);

export function CivDataProvider({ children }: { children: ReactNode }) {
  const { civs, globalUnits, loading, error, refreshCivs, updateCivLocally, updateGlobalUnitLocally } = useCivilizations();

  return (
    <CivDataContext.Provider value={{
      civilizations: civs,
      globalUnits: globalUnits.length > 0 ? globalUnits : unitsList,
      loading,
      error,
      refreshCivs,
      updateCivLocally,
      updateGlobalUnitLocally
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
