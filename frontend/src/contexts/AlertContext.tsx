/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useCallback, type ReactNode, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { sileo, Toaster } from 'sileo';

interface AlertContextType {
  error: (message: string) => void;
  success: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();

  const commonValues = useMemo(() => {
    return {
      duration: 2500,
      fill: "var(--color-dn-bg)",
      styles: {
        title: "text-white!",
        description: "text-white/75!",
      },
    }
  }, [])

  const error = useCallback((message: string) => {
    sileo.error({
      title: t('common.alertError'),
      description: message,
      ...commonValues,
      duration: 3000
    });
  }, [commonValues, t]);

  const success = useCallback((message: string) => {
    sileo.success({
      title: t('common.alertSuccess'),
      description: message,
      ...commonValues
    });
  }, [commonValues, t]);

  const info = useCallback((message: string) => {
    sileo.info({
      title: t('common.alertInfo'),
      description: message,
      ...commonValues
    });
  }, [commonValues, t]);

  const warning = useCallback((message: string) => {
    sileo.warning({
      title: t('common.alertWarning'),
      description: message,
      ...commonValues
    });
  }, [commonValues, t]);

  return (
    <AlertContext.Provider value={{ error, success, info, warning }}>
      {children}
      <Toaster position='top-center' />
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
