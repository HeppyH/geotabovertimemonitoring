/**
 * Calculates estimated vehicle-based after-hours driving from trip intervals.
 * Inputs must represent driving intervals, not ignition-on or idle time.
 */
export interface Schedule {
  timezone: string;
  startMinutes: number; // minutes from midnight
  endMinutes: number;
  workingDays: number[]; // JS day numbers: Sunday=0 ... Saturday=6
}
export interface Interval { start: Date; end: Date; }

export function calculateAfterHoursMinutes(trip: Interval, schedule: Schedule): number {
  if (!(trip.start instanceof Date) || !(trip.end instanceof Date) || trip.end <= trip.start) return 0;
  // MVP timezone handling uses Intl to map each minute to local calendar components.
  // Production implementation should use a timezone-aware library and split intervals
  // at local midnight and schedule boundaries.
  let overtime = 0;
  const cursor = new Date(trip.start);
  cursor.setSeconds(0, 0);
  while (cursor < trip.end) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: schedule.timezone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(cursor);
    const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
    const weekdayMap: Record<string, number> = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 };
    const day = weekdayMap[get('weekday')];
    const minute = Number(get('hour')) * 60 + Number(get('minute'));
    const isWorkingDay = schedule.workingDays.includes(day);
    const withinHours = schedule.startMinutes <= schedule.endMinutes
      ? minute >= schedule.startMinutes && minute < schedule.endMinutes
      : minute >= schedule.startMinutes || minute < schedule.endMinutes;
    if (!isWorkingDay || !withinHours) overtime++;
    cursor.setMinutes(cursor.getMinutes() + 1);
  }
  return Math.min(overtime, Math.ceil((trip.end.getTime() - trip.start.getTime()) / 60000));
}
