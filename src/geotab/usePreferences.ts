import { useState, useEffect, useCallback } from 'react';
import { useAddinApi } from './useAddinApi';
import { createPreferencesStore, type PreferencesStore, type UserPreferences } from './preferences';

let globalStore: PreferencesStore | null = null;

export function usePreferences() {
  const { apiClient, isReady } = useAddinApi();
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    if (globalStore) return globalStore.getPreferences();
    return createPreferencesStore(null).getPreferences();
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!isReady) return;

    if (!globalStore || globalStore !== createPreferencesStore(apiClient)) {
      globalStore = createPreferencesStore(apiClient);
      setPreferences(globalStore.getPreferences());
    }

    const unsubscribe = globalStore.subscribe(setPreferences);
    globalStore.loadFromAddInData().then(() => setIsLoaded(true));
    return unsubscribe;
  }, [apiClient, isReady]);

  const updatePreferences = useCallback(
    (partial: Partial<UserPreferences>) => {
      globalStore?.updatePreferences(partial);
    },
    []
  );

  return { preferences, updatePreferences, isLoaded };
}