/**
 * Geotab integration boundary.
 *
 * This MVP intentionally does not contain credentials or a fake API implementation.
 * Implement the methods below using the official MyGeotab Add-In API context and
 * the supported Geotab API SDK for the target MyGeotab environment.
 *
 * Before enabling live calls, verify API entity names/properties, Add-In lifecycle,
 * permissions, and Trip/DriverChange availability against current Geotab docs.
 */
export interface GeotabContext {
  api: unknown;
  database: string;
  server: string;
  userName: string;
}
export interface GeotabConnectionState {
  connected: boolean;
  database?: string;
  message: string;
}
export async function getConnectionState(): Promise<GeotabConnectionState> {
  const geotab = (window as Window & { geotab?: unknown }).geotab;
  if (!geotab) {
    return { connected: false, message: 'Standalone preview. Open this app through a registered MyGeotab Add-In to connect.' };
  }
  return { connected: false, message: 'MyGeotab runtime detected. Complete the official Add-In authentication adapter before enabling live data.' };
}
