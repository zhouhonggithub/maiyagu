import type { TimeWaveConfig } from './types.js';

/**
 * Parse "HH:MM" to minutes since midnight
 */
function parseTimeToMinutes(time: string): number {
  const parts = time.split(':').map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  return h * 60 + m;
}

/**
 * Parse time range "HH:MM-HH:MM" to [startMinutes, endMinutes]
 */
function parseTimeRange(range: string): [number, number] {
  const parts = range.split('-');
  const start = parts[0] ?? '00:00';
  const end = parts[1] ?? '24:00';
  return [parseTimeToMinutes(start), parseTimeToMinutes(end)];
}

/**
 * Validate TimeWaveConfig: non-overlapping, covers full 24h, positive intervals
 */
export function validateTimeWaveConfig(config: TimeWaveConfig): { valid: boolean; error?: string } {
  if (!config || config.length === 0) {
    return { valid: false, error: 'Config must have at least one entry' };
  }

  // Validate each entry
  for (const entry of config) {
    if (!entry.timeRange || !entry.timeRange.match(/^\d{2}:\d{2}-\d{2}:\d{2}$/)) {
      return { valid: false, error: `Invalid time range format: ${entry.timeRange}` };
    }
    if (!Number.isInteger(entry.intervalSec) || entry.intervalSec < 5 || entry.intervalSec > 86400) {
      return { valid: false, error: `Interval must be between 5 and 86400 seconds` };
    }
  }

  // Check coverage and overlap
  const ranges = config.map(e => parseTimeRange(e.timeRange));
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);

  let totalMinutes = 0;
  for (let i = 0; i < sorted.length; i++) {
    const range = sorted[i]!;
    const [start, end] = range;
    const duration = end > start ? end - start : (1440 - start) + end;
    totalMinutes += duration;

    // Check overlap with next range
    if (i < sorted.length - 1) {
      const nextRange = sorted[i + 1]!;
      const nextStart = nextRange[0];
      if (end > nextStart && end !== nextStart) {
        return { valid: false, error: 'Time ranges must not overlap' };
      }
    }
  }

  if (totalMinutes !== 1440) {
    return { valid: false, error: `Time ranges must cover exactly 24 hours (got ${totalMinutes} minutes)` };
  }

  return { valid: true };
}
