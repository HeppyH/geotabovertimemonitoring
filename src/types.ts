export type DriverStatus = 'Assigned' | 'Unassigned' | 'Requires verification';
export interface OvertimeRow {
  driver: string; vehicle: string; regularHours: number; overtimeHours: number;
  trips: number; status: 'Normal' | 'Medium' | 'High' | 'Unassigned';
  driverStatus: DriverStatus;
}
export interface Trip {
  id: string; driver: string; vehicle: string; start: string; end: string;
  durationMinutes: number; overtimeMinutes: number; distanceKm?: number;
}
