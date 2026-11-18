import type { GeotabApi, GeotabCredentials, Device, Trip, User, DriverChange, WorkTime, WorkTimeDetail, AddInData, TripSearch, DeviceSearch, UserSearch, DriverChangeSearch, FeedResult, GeotabId } from './entities';

const BASE_DELAY_MS = 1010;
const MAX_RETRIES = 5;
const MAX_DELAY_MS = 30000;

function isRetryableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as { name?: string; message?: string; status?: number };
  const status = err.status;
  return (
    err.name === 'OverLimitException' ||
    err.name === 'InvalidUserException' ||
    (typeof status === 'number' && (status === 429 || status === 503 || status === 504)) ||
    (typeof err.message === 'string' && (err.message.includes('timeout') || err.message.includes('network')))
  );
}

function isSessionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as { name?: string; message?: string };
  return (
    err.name === 'InvalidUserException' ||
    (typeof err.message === 'string' && err.message.includes('Invalid session'))
  );
}

function getRetryAfterMs(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const err = error as { retryAfter?: number; headers?: Record<string, string> };
  if (err.retryAfter) return err.retryAfter * 1000;
  if (err.headers?.['retry-after']) {
    const val = parseInt(err.headers['retry-after'], 10);
    return isNaN(val) ? null : val * 1000;
  }
  return null;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; baseDelay?: number; onRetry?: (attempt: number, error: unknown) => void } = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? MAX_RETRIES;
  const baseDelay = options.baseDelay ?? BASE_DELAY_MS;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) break;
      if (!isRetryableError(error)) throw error;

      const retryAfter = getRetryAfterMs(error);
      const delay = retryAfter ?? Math.min(baseDelay * Math.pow(2, attempt) + Math.random() * 1000, MAX_DELAY_MS);

      options.onRetry?.(attempt + 1, error);
      await sleep(delay);
    }
  }

  throw lastError;
}

function toRecord(obj: unknown): Record<string, unknown> {
  return obj as Record<string, unknown>;
}

export function createApiClient(api: GeotabApi, credentials: GeotabCredentials) {
  const reauthenticate = async (): Promise<GeotabApi> => {
    try {
      const result = await api.call('Authenticate', {
        database: credentials.database,
        userName: credentials.userName,
        password: '',
      }) as GeotabCredentials;
      return createApiWrapper(result);
    } catch {
      throw new Error('Re-authentication failed');
    }
  };

  function createApiWrapper(creds: GeotabCredentials): GeotabApi {
    return {
      call: (method: string, params: Record<string, unknown>) =>
        api.call(method, { ...params, credentials: creds }),

      get: <T>(typeName: string, search?: Record<string, unknown>, resultsLimit?: number, propertySelector?: string[]) =>
        api.get<T>(typeName, search, resultsLimit, propertySelector),

      getFeed: <T>(typeName: string, fromVersion: string | null, search?: Record<string, unknown>, resultsLimit?: number) =>
        api.getFeed<T>(typeName, fromVersion, search, resultsLimit),

      multiCall: (calls: Array<{ method: string; params: Record<string, unknown> }>) =>
        api.multiCall(calls),
    };
  }

  let currentApi = createApiWrapper(credentials);

  const executeWithAuth = async <T>(fn: (api: GeotabApi) => Promise<T>): Promise<T> => {
    return withRetry(async () => {
      try {
        return await fn(currentApi);
      } catch (error) {
        if (isSessionError(error)) {
          console.log('[API] Session expired, re-authenticating...');
          currentApi = await reauthenticate();
          return fn(currentApi);
        }
        throw error;
      }
    });
  };

  return {
    getDevices: (search?: DeviceSearch) =>
      executeWithAuth((api) => api.get<Device>('Device', toRecord(search), 5000)),

    getTrips: (search: TripSearch) =>
      executeWithAuth((api) => api.get<Trip>('Trip', toRecord(search), 25000)),

    getAllTripsPaginated: async (search: TripSearch, onProgress?: (count: number) => void): Promise<Trip[]> => {
      const allTrips: Trip[] = [];
      let hasMore = true;
      const pageSize = 5000;

      while (hasMore) {
        const pageSearch = { ...search, resultsLimit: pageSize };
        const trips = await executeWithAuth((api) => api.get<Trip>('Trip', toRecord(pageSearch), pageSize));
        allTrips.push(...trips);
        onProgress?.(allTrips.length);
        hasMore = trips.length === pageSize;
      }
      return allTrips;
    },

    getDrivers: (search?: UserSearch) =>
      executeWithAuth((api) => api.get<User>('User', toRecord({ ...search, isDriver: true }), 1000)),

    getDriverChanges: (search: DriverChangeSearch, fromVersion: string | null = null) =>
      executeWithAuth((api) => api.getFeed<DriverChange>('DriverChange', fromVersion, toRecord(search), 50000)),

    getWorkTime: (id: string) =>
      executeWithAuth((api) => api.get<WorkTime>('WorkTime', toRecord({ id }), 1)),

    getWorkTimeDetails: (ids: string[]) =>
      executeWithAuth((api) => api.get<WorkTimeDetail>('WorkTimeDetail', toRecord({ id: ids }), 100)),

    getAddInData: (addInId: string) =>
      executeWithAuth((api) => api.get<AddInData>('AddInData', toRecord({ addInId }), 100)),

    setAddInData: (addInData: Partial<AddInData> & { addInId: string; details: Record<string, unknown> }) =>
      executeWithAuth((api) => api.call('Set', { typeName: 'AddInData', entity: addInData })),

    addAddInData: (addInData: { addInId: string; details: Record<string, unknown>; groups?: GeotabId[] }) =>
      executeWithAuth((api) => api.call('Add', { typeName: 'AddInData', entity: addInData })),

    getCurrentUser: () =>
      executeWithAuth((api) => api.get<User>('User', toRecord({ id: credentials.userName }), 1)),
  };
}

export type TypedApiClient = ReturnType<typeof createApiClient>;