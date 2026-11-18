export type DriverStatus = 'Assigned' | 'Unassigned';

export interface OvertimeRow {
  driver: string;
  vehicle: string;
  regularHours: number;
  overtimeHours: number;
  trips: number;
  status: 'Normal' | 'Warning' | 'Critical' | 'Unassigned';
  driverStatus: DriverStatus;
}

export interface Trip {
  id: string;
  driver: string;
  vehicle: string;
  start: string;
  end: string;
  durationMinutes: number;
  overtimeMinutes: number;
  distanceKm?: number;
}

export type { VehicleOvertimeSummary, OvertimeRules } from './overtime/engine';
export type { Device, Trip as GeotabTrip, User, DriverChange, WorkTime, WorkTimeDetail, GeotabId } from './geotab/entities';