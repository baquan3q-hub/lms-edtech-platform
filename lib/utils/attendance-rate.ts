/**
 * Attendance Rate Calculator
 * 
 * Algorithm:
 * - Rate is based ONLY on "Đi học" (present) vs "Vắng" (absent + excused)
 * - "Đi muộn" (late) is NOT counted in the rate calculation
 * 
 * Formula: rate = (present / (present + absent + excused)) * 100
 * 
 * Note: `late` parameter is kept for backward compatibility but is ignored in rate calculation.
 */

/**
 * Calculate attendance rate (0-100%).
 * Based only on present vs absent (including excused).
 * Late is excluded from the calculation entirely.
 * 
 * @param present  Number of "present" records
 * @param late     Number of "late" records (ignored in rate calculation)
 * @param excused  Number of "excused" records (counted as absent)
 * @param absent   Number of "absent" records
 * @returns Rounded percentage (0-100)
 */
export function calcAttendanceRate(
    present: number,
    late: number = 0,
    excused: number = 0,
    absent: number = 0
): number {
    // Only count present vs (absent + excused), late is excluded
    const relevantTotal = present + absent + excused;
    if (relevantTotal === 0) return 0;

    return Math.round((present / relevantTotal) * 100);
}

/**
 * Calculates the attendance rate and returns it as a formatted string with one decimal place.
 * Based only on present vs absent (including excused). Late is excluded.
 */
export function calcAttendanceRateFormatted(
    present: number,
    late: number = 0,
    excused: number = 0,
    absent: number = 0
): string {
    // Only count present vs (absent + excused), late is excluded
    const relevantTotal = present + absent + excused;
    if (relevantTotal === 0) return "0.0";

    return ((present / relevantTotal) * 100).toFixed(1);
}
