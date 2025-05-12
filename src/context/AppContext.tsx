import React, { createContext, useContext, useState } from 'react';
import { useServiceInitialization } from '../hooks/useServiceInitialization';

interface AppContextType {
  isInitialized: boolean;
  error: string | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { isInitialized, error } = useServiceInitialization();

  return (
    <AppContext.Provider value={{ isInitialized, error }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}