import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type TabPulseContextType = {
  /** Her artışta "Notlarım" tab ikonunun zıplama animasyonunu tetikler. */
  notesPulseSignal: number;
  pulseNotesTab: () => void;
};

const TabPulseContext = createContext<TabPulseContextType | null>(null);

export function TabPulseProvider({ children }: { children: ReactNode }) {
  const [notesPulseSignal, setNotesPulseSignal] = useState(0);

  const pulseNotesTab = useCallback(() => {
    setNotesPulseSignal((prev) => prev + 1);
  }, []);

  const value = useMemo(
    () => ({ notesPulseSignal, pulseNotesTab }),
    [notesPulseSignal, pulseNotesTab]
  );

  return <TabPulseContext.Provider value={value}>{children}</TabPulseContext.Provider>;
}

export function useTabPulse() {
  const ctx = useContext(TabPulseContext);
  if (!ctx) {
    throw new Error('useTabPulse must be used within TabPulseProvider');
  }
  return ctx;
}
