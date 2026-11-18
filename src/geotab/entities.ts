export interface GeotabId {
  id: string;
}

export interface Device extends GeotabId {
  name: string;
  serialNumber: string;
  deviceType: string;
  groups: GeotabId[];
  timeZoneId: string;
  workTime: GeotabId | null;
  activeFrom: string;
  activeTo: string;
  comment: string;
  productId: string;
  supportsEngineHours: boolean;
  allowSynthesizedEngineHours: boolean | null;
  deviceFlags: number;
  version: number;
}

export interface User extends GeotabId {
  firstName: string;
  lastName: string;
  name: string;
  employeeNo: string;
  isDriver: boolean;
  comment: string;
  activeFrom: string;
  activeTo: string;
  version: number;
}

export interface Driver extends User {
  driverGroups: GeotabId[];
  keys: string[];
  licenseNumber: string;
  licenseProvince: string;
}

export interface Trip extends GeotabId {
  device: GeotabId;
  driver: GeotabId | null;
  start: string;
  stop: string;
  distance: number;
  drivingDuration: number;
  idlingDuration: number;
  workDrivingDuration: number;
  afterHoursDrivingDuration: number;
  afterHoursDistance: number;
  afterHoursStart: boolean;
  afterHoursEnd: boolean;
  workDistance: number;
  workStopDuration: number;
  afterHoursStopDuration: number;
  engineHours: number;
  maximumSpeed: number;
  averageSpeed: number;
  odometer: number;
  nextTripStart: string | null;
  stopPoint: { x: number; y: number } | null;
  speedRange1: number;
  speedRange1Duration: number;
  speedRange2: number;
  speedRange2Duration: number;
  speedRange3: number;
  speedRange3Duration: number;
  deletedDateTime: string | null;
  version: number;
}

export interface DriverChange extends GeotabId {
  device: GeotabId;
  driver: GeotabId | null;
  dateTime: string;
  type: 'LogOn' | 'LogOff';
  version: number;
}

export interface WorkTime extends GeotabId {
  name: string;
  details: WorkTimeDetail[];
  holidayGroup: GeotabId | null;
  comment: string;
  version: number;
}

export interface WorkTimeDetail extends GeotabId {
  dayOfWeek: number;
  fromTime: number;
  toTime: number;
}

export interface AddInData extends GeotabId {
  addInId: GeotabId;
  groups: GeotabId[];
  details: Record<string, unknown>;
  version: number;
}

export interface GeotabCredentials {
  database: string;
  userName: string;
  sessionId: string;
  path: string;
}

export interface GeotabApi {
  call(method: string, params: Record<string, unknown>): Promise<unknown>;
  get<T>(typeName: string, search?: Record<string, unknown>, resultsLimit?: number, propertySelector?: string[]): Promise<T[]>;
  getFeed<T>(typeName: string, fromVersion: string | null, search?: Record<string, unknown>, resultsLimit?: number): Promise<FeedResult<T>>;
  multiCall(calls: Array<{ method: string; params: Record<string, unknown> }>): Promise<unknown[]>;
}

export interface FeedResult<T> {
  data: T[];
  toVersion: string;
}

export interface TripSearch {
  deviceSearch?: { id?: string; groups?: GeotabId[] };
  userSearch?: { id?: string };
  fromDate?: string;
  toDate?: string;
  includeDeleted?: boolean;
  includeOverlappedTrips?: boolean;
  id?: string;
}

export interface DeviceSearch {
  id?: string;
  groups?: GeotabId[];
}

export interface UserSearch {
  id?: string;
}

export interface DriverChangeSearch {
  deviceSearch?: { id?: string; groups?: GeotabId[] };
  userSearch?: { id?: string; driverGroups?: GeotabId[] };
  fromDate?: string;
  toDate?: string;
  type?: 'LogOn' | 'LogOff';
  includeOverlappedChanges?: boolean;
  id?: string;
}