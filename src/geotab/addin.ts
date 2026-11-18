import type { GeotabApi, GeotabCredentials } from './entities';

const ADDIN_NAMESPACE = 'geotab.addin.overtimeMonitoring';

interface AddinState {
  api: GeotabApi | null;
  credentials: GeotabCredentials | null;
  initialized: boolean;
  callbacks: Array<() => void>;
}

const state: AddinState = {
  api: null,
  credentials: null,
  initialized: false,
  callbacks: [],
};

function getGeotabObject(): unknown {
  if (typeof window !== 'undefined') {
    return (window as Window & { geotab?: unknown }).geotab;
  }
  return null;
}

function isInMyGeotab(): boolean {
  return getGeotabObject() !== null;
}

function createApiWrapper(geotabApi: unknown): GeotabApi {
  const api = geotabApi as { call: (method: string, params: Record<string, unknown>) => Promise<unknown> };

  return {
    call: (method: string, params: Record<string, unknown>) => api.call(method, params),

    async get<T>(typeName: string, search?: Record<string, unknown>, resultsLimit?: number, propertySelector?: string[]) {
      const params: Record<string, unknown> = { typeName };
      if (search) params.search = search;
      if (resultsLimit) params.resultsLimit = resultsLimit;
      if (propertySelector) params.propertySelector = { fields: propertySelector, isIncluded: true };
      return api.call('Get', params) as Promise<T[]>;
    },

    async getFeed<T>(typeName: string, fromVersion: string | null, search?: Record<string, unknown>, resultsLimit?: number) {
      const params: Record<string, unknown> = { typeName };
      if (fromVersion) params.fromVersion = fromVersion;
      if (search) params.search = search;
      if (resultsLimit) params.resultsLimit = resultsLimit;
      return api.call('GetFeed', params) as Promise<FeedResult<T>>;
    },

    async multiCall(calls: Array<{ method: string; params: Record<string, unknown> }>) {
      return api.call('ExecuteMultiCall', { calls }) as Promise<unknown[]>;
    },
  };
}

interface FeedResult<T> {
  data: T[];
  toVersion: string;
}

function initializeAddin(api: GeotabApi, credentials: GeotabCredentials): void {
  state.api = api;
  state.credentials = credentials;
  state.initialized = true;

  state.callbacks.forEach((cb) => cb());
  state.callbacks = [];
}

interface AddinLifecycle {
  initialize: (api: unknown, state: unknown, callback: () => void) => Promise<void>;
  focus: (api: unknown, state: unknown) => Promise<void>;
  blur: () => Promise<void>;
}

export function initializeAddinLifecycle(
  onReady: (api: GeotabApi, credentials: GeotabCredentials) => void
): void {
  const geotab = getGeotabObject();

  if (!geotab) {
    console.warn('[Add-In] Not running inside MyGeotab — standalone mode');
    return;
  }

  const api = createApiWrapper(geotab);

  const init = async () => {
    try {
      const result = await api.call('GetVersion', {}) as { version: string; apiVersion: string };
      console.log('[Add-In] MyGeotab API version:', result);
    } catch (e) {
      console.error('[Add-In] Failed to verify API:', e);
    }
  };

  const lifecycle: AddinLifecycle = {
    initialize: async (_api: unknown, _state: unknown, callback: () => void) => {
      const api = createApiWrapper(_api);
      const credentials = _state as GeotabCredentials;
      initializeAddin(api, credentials);
      await init();
      callback();
      onReady(api, credentials);
    },
    focus: async (_api: unknown, _state: unknown) => {
      state.api = createApiWrapper(_api);
      state.credentials = _state as GeotabCredentials;
      state.callbacks.forEach((cb) => cb());
      state.callbacks = [];
    },
    blur: async () => {
      // Save preferences, cleanup
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any)[ADDIN_NAMESPACE] = lifecycle;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const geotabWin = window as any;
  if (geotabWin.geotab?.addin?.register) {
    geotabWin.geotab.addin.register(ADDIN_NAMESPACE, lifecycle);
  }
}

export function onAddinReady(callback: (api: GeotabApi, credentials: GeotabCredentials) => void): void {
  if (state.initialized && state.api && state.credentials) {
    callback(state.api, state.credentials);
  } else {
    state.callbacks.push(() => {
      if (state.api && state.credentials) {
        callback(state.api, state.credentials);
      }
    });
  }
}

export function getAddinApi(): GeotabApi | null {
  return state.api;
}

export function getAddinCredentials(): GeotabCredentials | null {
  return state.credentials;
}

export function isAddinInitialized(): boolean {
  return state.initialized;
}

export function isRunningInMyGeotab(): boolean {
  return isInMyGeotab();
}