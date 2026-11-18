import { useState, useEffect, createContext, useContext, ReactNode, ReactElement, createElement } from 'react';
import { getAddinApi, getAddinCredentials, onAddinReady, isAddinInitialized, isRunningInMyGeotab } from './addin';
import { createApiClient, type TypedApiClient } from './api';

interface AddinApiContextValue {
  apiClient: TypedApiClient | null;
  isReady: boolean;
  isInMyGeotab: boolean;
}

const AddinApiContext = createContext<AddinApiContextValue>({
  apiClient: null,
  isReady: false,
  isInMyGeotab: false,
});

export function AddinApiProvider({ children }: { children: ReactNode }): ReactElement {
  const [apiClient, setApiClient] = useState<TypedApiClient | null>(null);
  const [isReady, setIsReady] = useState(false);
  const inMyGeotab = isRunningInMyGeotab();

  useEffect(() => {
    if (!inMyGeotab) {
      setIsReady(true);
      return;
    }

    if (isAddinInitialized()) {
      const api = getAddinApi();
      const creds = getAddinCredentials();
      if (api && creds) {
        setApiClient(createApiClient(api, creds));
        setIsReady(true);
      }
    } else {
      onAddinReady((api, creds) => {
        setApiClient(createApiClient(api, creds));
        setIsReady(true);
      });
    }
  }, [inMyGeotab]);

  return createElement(
    AddinApiContext.Provider,
    { value: { apiClient, isReady, isInMyGeotab: inMyGeotab } },
    children
  );
}

export function useAddinApi(): AddinApiContextValue {
  const context = useContext(AddinApiContext);
  if (!context) {
    throw new Error('useAddinApi must be used within AddinApiProvider');
  }
  return context;
}