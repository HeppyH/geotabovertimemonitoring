import { initializeAddinLifecycle, onAddinReady, getAddinApi, getAddinCredentials, isAddinInitialized, isRunningInMyGeotab } from './addin';
export { initializeAddinLifecycle, onAddinReady, getAddinApi, getAddinCredentials, isAddinInitialized, isRunningInMyGeotab } from './addin';
export { createApiClient, withRetry, type TypedApiClient } from './api';
export { useAddinApi, AddinApiProvider } from './useAddinApi';
export { useDevices, useDrivers, useTrips, useVehicleSummaries, useDashboardMetrics, useTripDetails, useWorkTime, useWorkTimeDetails } from './hooks';
export { usePreferences } from './usePreferences';
export { createPreferencesStore, type UserPreferences, DEFAULT_PREFERENCES } from './preferences';
export type { Device, Trip, User, DriverChange, WorkTime, WorkTimeDetail, AddInData, TripSearch, DeviceSearch, UserSearch, DriverChangeSearch, GeotabId, GeotabApi, GeotabCredentials } from './entities';
export type { OvertimeRules, VehicleOvertimeSummary } from '../overtime/engine';
export { calculateOvertimeSummary, calculateDashboardMetrics, msToHours, formatDuration, DEFAULT_OVERTIME_RULES } from '../overtime/engine';

export interface GeotabConnectionState {
  connected: boolean;
  database?: string;
  userName?: string;
  message: string;
}

export async function getConnectionState(): Promise<GeotabConnectionState> {
  const inMyGeotab = isRunningInMyGeotab();
  if (!inMyGeotab) {
    return { connected: false, message: 'Standalone preview. Open this app through a registered MyGeotab Add-In to connect.' };
  }
  const creds = getAddinCredentials();
  if (creds) {
    return { connected: true, database: creds.database, userName: creds.userName, message: 'Connected to MyGeotab' };
  }
  return { connected: false, message: 'MyGeotab runtime detected. Initializing Add-In...' };
}