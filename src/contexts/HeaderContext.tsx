'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface Breadcrumb {
  label: string;
  href?: string;
}

export interface HeaderConfig {
  title: string;
  description?: string;
  actions?: ReactNode;
  sticky?: boolean;
  breadcrumbs?: Breadcrumb[];
}

interface HeaderContextType {
  config: HeaderConfig | null;
  setHeader: (config: HeaderConfig) => void;
  clearHeader: () => void;
}

const HeaderContext = createContext<HeaderContextType | undefined>(undefined);

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<HeaderConfig | null>(null);

  const setHeader = useCallback((newConfig: HeaderConfig) => {
    setConfig(newConfig);
  }, []);

  const clearHeader = useCallback(() => {
    setConfig(null);
  }, []);

  return (
    <HeaderContext.Provider value={{ config, setHeader, clearHeader }}>
      {children}
    </HeaderContext.Provider>
  );
}

export function useHeader() {
  const context = useContext(HeaderContext);
  if (!context) {
    throw new Error('useHeader must be used within a HeaderProvider');
  }
  return context;
}
