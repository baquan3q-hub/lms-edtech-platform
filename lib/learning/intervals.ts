export type Interval = [number, number];
export function mergeIntervals(input: Interval[]): Interval[] {
    const sorted = input.filter(([s, e]) => Number.isFinite(s) && Number.isFinite(e) && e > s).map(v => [...v] as Interval).sort((a, b) => a[0] - b[0]);
    const result: Interval[] = [];
    for (const next of sorted) {
        const prev = result[result.length - 1];
        if (prev && next[0] <= prev[1]) prev[1] = Math.max(prev[1], next[1]); else result.push(next);
    }
    return result;
}
export const intervalDuration = (intervals: Interval[]) => mergeIntervals(intervals).reduce((sum, [s, e]) => sum + e - s, 0);
export function videoCoverage(intervals: Interval[], duration: number) {
    if (!Number.isFinite(duration) || duration <= 0) return 0;
    return Math.min(1, intervalDuration(intervals.map(([s, e]) => [Math.max(0, s), Math.min(duration, e)])) / duration);
}
