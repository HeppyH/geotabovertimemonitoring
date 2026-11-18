import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAddinApi } from './useAddinApi';
import type { Device, Trip, User, WorkTime, WorkTimeDetail, TripSearch, GeotabId } from './entities';
import { startOfDay, endOfDay, format, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const UNKNOWN_DRIVER_ID = 'UnknownDriverId';

interface TripWithMeta extends Trip {
  deviceName: string;
  deviceTimezone: string;
  driverName: string;
  driverStatus: 'Assigned' | 'Unassigned';
  localDate: string;
}

interface VehicleSummary {
  vehicleId: string;
  vehicleName: string;
  driverName: string;
  driverStatus: 'Assigned' | 'Unassigned';
  totalDrivingMs: number;
  totalIdlingMs: number;
  totalAfterHoursMs: number;
  tripCount: number;
  status: 'Normal' | 'Warning' | 'Critical';
  afterHoursHours: number;
}

interface DashboardMetrics {
  totalVehicles: number;
  vehiclesWithAfterHours: number;
  totalAfterHoursHours: number;
  unassignedCount: number;
}

function getDeviceTimezone(device: Device): string {
  return device.timeZoneId || 'UTC';
}

function getTripLocalDate(trip: Trip, timezone: string): string {
  const start = parseISO(trip.start);
  const localStart = toZonedTime(start, timezone);
  return format(localStart, 'yyyy-MM-dd');
}

function isTripInDateRange(trip: Trip, from: Date, to: Date, timezone: string): boolean {
  const tripDate = getTripLocalDate(trip, timezone);
  const fromStr = format(from, 'yyyy-MM-dd');
  const toStr = format(to, 'yyyy-MM-dd');
  return tripDate >= fromStr && tripDate <= toStr;
}

function resolveDriverName(trip: Trip, drivers: Map<string, User>): { name: string; status: 'Assigned' | 'Unassigned' } {
  if (trip.driver && trip.driver.id && trip.driver.id !== UNKNOWN_DRIVER_ID) {
    const driver = drivers.get(trip.driver.id);
    if (driver) {
      const name = `${driver.firstName} ${driver.lastName}`.trim() || driver.name || driver.employeeNo || 'Unknown Driver';
      return { name, status: 'Assigned' };
    }
  }
  return { name: 'Unassigned', status: 'Unassigned' };
}

function getDateRangeForPeriod(period: string, timezone: string): { from: Date; to: Date } {
  const now = toZonedTime(new Date(), timezone);
  let from: Date;
  let to: Date = endOfDay(now);

  switch (period) {
    case 'today':
      from = startOfDay(now);
      break;
    case 'week':
      from = startOfDay(now);
      from.setDate(from.getDate() - 6);
      break;
    case 'month':
      from = startOfDay(now);
      from.setDate(1);
      break;
    default:
      from = startOfDay(now);
      from.setDate(from.getDate() - 6);
  }

  return { from, to };
}

export function useDevices() {
  const { apiClient } = useAddinApi();

  return useQuery({
    queryKey: ['devices'],
    queryFn: async () => {
      if (!apiClient) throw new Error('API client not initialized');
      return apiClient.getDevices();
    },
    enabled: !!apiClient,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDrivers() {
  const { apiClient } = useAddinApi();

  return useQuery({
    queryKey: ['drivers'],
    queryFn: async () => {
      if (!apiClient) throw new Error('API client not initialized');
      return apiClient.getDrivers();
    },
    enabled: !!apiClient,
    staleTime: 10 * 60 * 1000,
  });
}

export function useWorkTime(workTimeId: string | null) {
  const { apiClient } = useAddinApi();

  return useQuery({
    queryKey: ['workTime', workTimeId],
    queryFn: async () => {
      if (!apiClient || !workTimeId) return null;
      return apiClient.getWorkTime(workTimeId);
    },
    enabled: !!apiClient && !!workTimeId,
    staleTime: 30 * 60 * 1000,
  });
}

export function useWorkTimeDetails(workTime: WorkTime | null) {
  const { apiClient } = useAddinApi();
  const detailIds = workTime?.details?.map((d: WorkTimeDetail) => d.id) ?? [];

  return useQuery({
    queryKey: ['workTimeDetails', detailIds.join(',')],
    queryFn: async () => {
      if (!apiClient || detailIds.length === 0) return [];
      return apiClient.getWorkTimeDetails(detailIds);
    },
    enabled: !!apiClient && detailIds.length > 0,
    staleTime: 30 * 60 * 1000,
  });
}

export function useTrips(period: string = 'week', deviceIds?: string[]) {
  const { apiClient } = useAddinApi();
  const { data: devices } = useDevices();
  const { data: drivers } = useDrivers();

  const driverMap = new Map<string, User>();
  drivers?.forEach((d) => driverMap.set(d.id, d));

  return useQuery({
    queryKey: ['trips', period, deviceIds?.join(',')],
    queryFn: async (): Promise<TripWithMeta[]> => {
      if (!apiClient) throw new Error('API client not initialized');
      if (!devices || devices.length === 0) return [];

      const timezone = devices[0]?.timeZoneId || 'UTC';
      const { from, to } = getDateRangeForPeriod(period, timezone);

      const deviceFilter = deviceIds?.length ? deviceIds : devices.map((d) => d.id);

      const search: TripSearch = {
        deviceSearch: { groups: [] },
        fromDate: from.toISOString(),
        toDate: to.toISOString(),
        includeOverlappedTrips: true,
      };

      if (deviceFilter.length === 1) {
        search.deviceSearch = { id: deviceFilter[0] };
      } else {
        search.deviceSearch = { groups: deviceFilter.map((id) => ({ id })) };
      }

      const trips = await apiClient.getAllTripsPaginated(search);

      const tripsWithMeta: TripWithMeta[] = trips
        .filter((trip) => isTripInDateRange(trip, from, to, timezone))
        .map((trip) => {
          const device = devices.find((d) => d.id === trip.device?.id);
          const driverInfo = resolveDriverName(trip, driverMap);
          return {
            ...trip,
            deviceName: device?.name || trip.device?.id || 'Unknown Vehicle',
            deviceTimezone: device ? getDeviceTimezone(device) : timezone,
            driverName: driverInfo.name,
            driverStatus: driverInfo.status,
            localDate: getTripLocalDate(trip, device ? getDeviceTimezone(device) : timezone),
          };
        });

      return tripsWithMeta;
    },
    enabled: !!apiClient && !!devices?.length,
    staleTime: 2 * 60 * 1000,
  });
}

export function useVehicleSummaries(period: string = 'week') {
  const { data: trips, isLoading, error, refetch } = useTrips(period);

  const summaries = trips?.reduce((acc: Map<string, VehicleSummary>, trip) => {
    const deviceId = trip.device?.id || 'unknown';
    const existing = acc.get(deviceId);

    if (existing) {
      existing.totalDrivingMs += trip.drivingDuration || 0;
      existing.totalIdlingMs += trip.idlingDuration || 0;
      existing.totalAfterHoursMs += trip.afterHoursDrivingDuration || 0;
      existing.tripCount += 1;
      if (trip.driverStatus === 'Assigned') {
        existing.driverName = trip.driverName;
        existing.driverStatus = 'Assigned';
      }
    } else {
      const afterHoursHours = (trip.afterHoursDrivingDuration || 0) / 3600000;
      let status: 'Normal' | 'Warning' | 'Critical' = 'Normal';
      if (afterHoursHours >= 10) status = 'Critical';
      else if (afterHoursHours >= 5) status = 'Warning';

      acc.set(deviceId, {
        vehicleId: deviceId,
        vehicleName: trip.deviceName,
        driverName: trip.driverName,
        driverStatus: trip.driverStatus,
        totalDrivingMs: trip.drivingDuration || 0,
        totalIdlingMs: trip.idlingDuration || 0,
        totalAfterHoursMs: trip.afterHoursDrivingDuration || 0,
        tripCount: 1,
        status,
        afterHoursHours: Number(afterHoursHours.toFixed(2)),
      });
    }

    return acc;
  }, new Map<string, VehicleSummary>()) || new Map();

  const result = Array.from(summaries.values()).sort((a, b) => b.totalAfterHoursMs - a.totalAfterHoursMs);

  return { data: result, isLoading, error, refetch };
}

export function useDashboardMetrics(period: string = 'week'): { data: DashboardMetrics; isLoading: boolean } {
  const { data: vehicles } = useDevices();
  const { data: trips, isLoading } = useTrips(period);

  if (!trips || trips.length === 0) {
    return {
      data: {
        totalVehicles: vehicles?.length || 0,
        vehiclesWithAfterHours: 0,
        totalAfterHoursHours: 0,
        unassignedCount: 0,
      },
      isLoading,
    };
  }

  const vehicleSet = new Set<string>();
  const unassignedSet = new Set<string>();
  let totalAfterHoursMs = 0;

  trips.forEach((trip) => {
    if (trip.afterHoursDrivingDuration > 0) {
      vehicleSet.add(trip.device?.id || 'unknown');
      totalAfterHoursMs += trip.afterHoursDrivingDuration;
    }
    if (trip.driverStatus === 'Unassigned') {
      unassignedSet.add(trip.device?.id || 'unknown');
    }
  });

  return {
    data: {
      totalVehicles: vehicles?.length || 0,
      vehiclesWithAfterHours: vehicleSet.size,
      totalAfterHoursHours: Number((totalAfterHoursMs / 3600000).toFixed(2)),
      unassignedCount: unassignedSet.size,
    },
    isLoading,
  };
}

export function useTripDetails(period: string = 'week', deviceIds?: string[]) {
  const { data: trips, isLoading, error, refetch } = useTrips(period, deviceIds);

  return {
    data: trips?.map((trip) => ({
      id: trip.id,
      vehicle: trip.deviceName,
      driver: trip.driverName,
      driverStatus: trip.driverStatus,
      start: trip.start,
      stop: trip.stop,
      drivingDuration: trip.drivingDuration,
      idlingDuration: trip.idlingDuration,
      afterHoursDrivingDuration: trip.afterHoursDrivingDuration,
      distance: trip.distance,
      afterHoursDistance: trip.afterHoursDistance,
      localDate: trip.localDate,
    })) || [],
    isLoading,
    error,
    refetch,
  };
}