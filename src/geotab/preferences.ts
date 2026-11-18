import type { TypedApiClient } from './api';

const ADDIN_ID = 'a2C4ABQuLFkepPVf6-4OKAQ'; // Base64 encoded GUID for this Add-In
const STORAGE_KEY = 'geotab-overtime-preferences';

export interface UserPreferences {
  monitoringPeriod: 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'past7Days' | 'past14Days' | 'past30Days' | 'thisYear' | 'lastYear' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
  overtimeRules: {
    gracePeriodMinutes: number;
    minimumOvertimeMinutes: number;
    warningThresholdHours: number;
    criticalThresholdHours: number;
  };
  displayTimezone: string;
  weekStartDay: 0 | 1 | 6;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  monitoringPeriod: 'today',
  customStartDate: undefined,
  customEndDate: undefined,
  overtimeRules: {
    gracePeriodMinutes: 0,
    minimumOvertimeMinutes: 0,
    warningThresholdHours: 5,
    criticalThresholdHours: 10,
  },
  displayTimezone: 'Asia/Jakarta',
  weekStartDay: 1,
};

function getLocalPreferences(): UserPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_PREFERENCES;
}

function saveLocalPreferences(prefs: UserPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage errors
  }
}

export function createPreferencesStore(apiClient: TypedApiClient | null) {
  let currentPrefs = getLocalPreferences();
  let listeners: Array<(prefs: UserPreferences) => void> = [];
  let isLoadingFromCloud = false;

  async function loadFromAddInData(): Promise<UserPreferences> {
    if (!apiClient) return currentPrefs;
    if (isLoadingFromCloud) return currentPrefs;

    isLoadingFromCloud = true;
    try {
      const results = await apiClient.getAddInData(ADDIN_ID);
      if (results.length > 0) {
        const cloudPrefs = results[0].details as Partial<UserPreferences>;
        currentPrefs = { ...DEFAULT_PREFERENCES, ...currentPrefs, ...cloudPrefs };
        saveLocalPreferences(currentPrefs);
        notifyListeners();
      }
    } catch (error) {
      console.warn('[Preferences] Failed to load from AddInData:', error);
    } finally {
      isLoadingFromCloud = false;
    }
    return currentPrefs;
  }

  async function saveToAddInData(prefs: UserPreferences): Promise<void> {
    if (!apiClient) {
      currentPrefs = prefs;
      saveLocalPreferences(prefs);
      notifyListeners();
      return;
    }

try {
      const existing = await apiClient.getAddInData(ADDIN_ID);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const details = prefs as any;
      if (existing.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const existingId = String((existing[0].id as any).id ?? existing[0].id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await apiClient.setAddInData({
          id: existingId,
          addInId: { id: ADDIN_ID },
          details,
        } as any);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await apiClient.addAddInData({
          addInId: { id: ADDIN_ID },
          details,
        } as any);
      }
      currentPrefs = prefs;
      saveLocalPreferences(prefs);
      notifyListeners();
    } catch (error) {
      console.warn('[Preferences] Failed to save to AddInData:', error);
      currentPrefs = prefs;
      saveLocalPreferences(prefs);
      notifyListeners();
    }
  }

  function notifyListeners(): void {
    listeners.forEach((fn) => fn(currentPrefs));
  }

  function subscribe(fn: (prefs: UserPreferences) => void): () => void {
    listeners.push(fn);
    return () => {
      listeners = listeners.filter((l) => l !== fn);
    };
  }

  function getPreferences(): UserPreferences {
    return currentPrefs;
  }

  function updatePreferences(partial: Partial<UserPreferences>): void {
    const newPrefs = { ...currentPrefs, ...partial };
    if (partial.overtimeRules) {
      newPrefs.overtimeRules = { ...currentPrefs.overtimeRules, ...partial.overtimeRules };
    }
    saveToAddInData(newPrefs);
  }

  return {
    getPreferences,
    updatePreferences,
    subscribe,
    loadFromAddInData,
  };
}

export type PreferencesStore = ReturnType<typeof createPreferencesStore>;