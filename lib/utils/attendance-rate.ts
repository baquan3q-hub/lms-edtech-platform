/**
 * Weighted Attendance Rate Calculator
 * 
 * Algorithm:
 * - present:  1.0 (100%) — Full attendance
 * - excused:  0.8 (80%)  — Valid reason, not penalized heavily
 * - late:     0.7 (70%)  — Still came, minor penalty
 * - absent:   0.0 (0%)   — No-show without reason
 * 
 * Formula: rate = ((present*1.0 + excused*0.8 + late*0.7) / total) * 100
 */

const ATTENDANCE_WEIGHTS = {
    present: 1.0,
    excused: 0.8,
    late: 0.7,
    absent: 0.0,
} as const;

/**
 * Calculate weighted attendance rate (0-100%).
 * More lenient than a simple present/total calculation.
 * 
 * @param present  Number of "present" records
 * @param late     Number of "late" records
 * @param excused  Number of "excused" records
 * @param absent   Number of "absent" records
 * @returns Rounded percentage (0-100)
 */
export function calcAttendanceRate(
    present: number,
    late: number = 0,
    excused: number = 0,
    absent: number = 0
): number {
    const total = present + late + excused + absent;
    if (total === 0) return 0;

    const weightedScore =
        present * ATTENDANCE_WEIGHTS.present +
        excused * ATTENDANCE_WEIGHTS.excused +
        late * ATTENDANCE_WEIGHTS.late +
        absent * ATTENDANCE_WEIGHTS.absent;

    return Math.round((weightedScore / total) * 100);
}

/**
 * Calculates the weighted attendance rate and returns it as a formatted string with one decimal place.
 * Used in contexts where a string percentage is required.
 */
export function calcAttendanceRateFormatted(
    present: number,
    late: number = 0,
    excused: number = 0,
    absent: number = 0
): string {
    const total = present + late + excused + absent;
    if (total === 0) return "0.0";

    const weightedScore =
        present * ATTENDANCE_WEIGHTS.present +
        excused * ATTENDANCE_WEIGHTS.excused +
        late * ATTENDANCE_WEIGHTS.late +
        absent * ATTENDANCE_WEIGHTS.absent;

    return ((weightedScore / total) * 100).toFixed(1);
}

export { ATTENDANCE_WEIGHTS };
