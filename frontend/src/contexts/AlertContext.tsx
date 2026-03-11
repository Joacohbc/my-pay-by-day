/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useCallback, type ReactNode, useMemo } from 'react';
import { sileo, Toaster } from 'sileo';

interface AlertContextType {
  error: (message: string) => void;
  success: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {

  const commonValues = useMemo(() => {
    return {
      duration: 1000,
      fill: "var(--color-dn-bg)",
      styles: {
        title: "text-white!",
        description: "text-white/75!",
      },
    }
  }, [])

  const error = useCallback((message: string) => {
    sileo.error({
      title: message,
      ...commonValues,
      duration: 3000
    });
  }, [commonValues]);

  const success = useCallback((message: string) => {
    sileo.success({
      title: message,
      ...commonValues
    });
  }, [commonValues]);

  const info = useCallback((message: string) => {
    sileo.info({
      title: message,
      ...commonValues
    });
  }, [commonValues]);

  const warning = useCallback((message: string) => {
    sileo.warning({
      title: message,
      ...commonValues
    });
  }, [commonValues]);

  return (
    <AlertContext.Provider value={{ error, success, info, warning }}>
      {children}
      <Toaster position='bottom-center' />
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}
