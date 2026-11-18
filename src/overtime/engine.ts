export interface OvertimeRules {
  gracePeriodMinutes: number;
  minimumOvertimeMinutes: number;
  warningThresholdHours: number;
  criticalThresholdHours: number;
}

export const DEFAULT_OVERTIME_RULES: OvertimeRules = {
  gracePeriodMinutes: 0,
  minimumOvertimeMinutes: 0,
  warningThresholdHours: 5,
  criticalThresholdHours: 10,
};

export interface VehicleOvertimeSummary {
  vehicleId: string;
  vehicleName: string;
  driverName: string;
  driverStatus: 'Assigned' | 'Unassigned';
  totalDrivingMs: number;
  totalIdlingMs: number;
  totalAfterHoursMs: number;
  adjustedAfterHoursMs: number;
  tripCount: number;
  afterHoursHours: number;
  status: 'Normal' | 'Warning' | 'Critical';
}

export function calculateOvertimeSummary(
  trips: Array<{
    device?: { id: string };
    deviceName: string;
    driverName: string;
    driverStatus: 'Assigned' | 'Unassigned';
    drivingDuration: number;
    idlingDuration: number;
    afterHoursDrivingDuration: number;
  }>,
  rules: OvertimeRules = DEFAULT_OVERTIME_RULES
): VehicleOvertimeSummary[] {
  const map = new Map<string, VehicleOvertimeSummary>();

  for (const trip of trips) {
    const vehicleId = trip.device?.id || 'unknown';
    const existing = map.get(vehicleId);

    const afterHoursMs = Math.max(0, (trip.afterHoursDrivingDuration || 0) - rules.gracePeriodMinutes * 60000);
    const adjustedAfterHoursMs = afterHoursMs < rules.minimumOvertimeMinutes * 60000 ? 0 : afterHoursMs;

    if (existing) {
      existing.totalDrivingMs += trip.drivingDuration || 0;
      existing.totalIdlingMs += trip.idlingDuration || 0;
      existing.totalAfterHoursMs += trip.afterHoursDrivingDuration || 0;
      existing.adjustedAfterHoursMs += adjustedAfterHoursMs;
      existing.tripCount += 1;
      if (trip.driverStatus === 'Assigned') {
        existing.driverName = trip.driverName;
        existing.driverStatus = 'Assigned';
      }
    } else {
      const afterHoursHours = adjustedAfterHoursMs / 3600000;
      let status: 'Normal' | 'Warning' | 'Critical' = 'Normal';
      if (afterHoursHours >= rules.criticalThresholdHours) status = 'Critical';
      else if (afterHoursHours >= rules.warningThresholdHours) status = 'Warning';

      map.set(vehicleId, {
        vehicleId,
        vehicleName: trip.deviceName,
        driverName: trip.driverName,
        driverStatus: trip.driverStatus,
        totalDrivingMs: trip.drivingDuration || 0,
        totalIdlingMs: trip.idlingDuration || 0,
        totalAfterHoursMs: trip.afterHoursDrivingDuration || 0,
        adjustedAfterHoursMs,
        tripCount: 1,
        afterHoursHours: Number(afterHoursHours.toFixed(2)),
        status,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.adjustedAfterHoursMs - a.adjustedAfterHoursMs);
}

export function calculateDashboardMetrics(
  trips: Array<{ afterHoursDrivingDuration: number; driverStatus: 'Assigned' | 'Unassigned'; device?: { id: string } }>,
  totalVehicles: number
) {
  const vehicleSet = new Set<string>();
  const unassignedSet = new Set<string>();
  let totalAfterHoursMs = 0;

  for (const trip of trips) {
    if (trip.afterHoursDrivingDuration > 0) {
      vehicleSet.add(trip.device?.id || 'unknown');
      totalAfterHoursMs += trip.afterHoursDrivingDuration;
    }
    if (trip.driverStatus === 'Unassigned') {
      unassignedSet.add(trip.device?.id || 'unknown');
    }
  }

  return {
    totalVehicles,
    vehiclesWithAfterHours: vehicleSet.size,
    totalAfterHoursHours: Number((totalAfterHoursMs / 3600000).toFixed(2)),
    unassignedCount: unassignedSet.size,
  };
}

export function msToHours(ms: number): number {
  return Number((ms / 3600000).toFixed(2));
}

export function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}