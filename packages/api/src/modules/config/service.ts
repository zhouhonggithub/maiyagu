import { nowISO, ValidationError } from '@ai-farm/shared';
import type { TimeWaveConfig } from '@ai-farm/shared';
import type { AppDb } from '../../shared/db';
import * as configRepo from './repository';

function parseTimeRange(range: string): [number, number] {
  const parts = range.split('-').map((t) => {
    const segments = t.split(':').map(Number);
    return (segments[0] ?? 0) * 60 + (segments[1] ?? 0);
  });
  return [parts[0] ?? 0, parts[1] ?? 0];
}

function validateTimeWaveCoverage(config: TimeWaveConfig) {
  // Sort by start time
  const ranges = config.map((entry) => ({
    ...entry,
    parsed: parseTimeRange(entry.timeRange),
  }));
  ranges.sort((a, b) => a.parsed[0] - b.parsed[0]);

  // Check full 24h coverage (0 to 1440 minutes) and no overlaps
  let coveredUntil = 0;
  for (const range of ranges) {
    const [start, end] = range.parsed;
    if (start > coveredUntil) {
      throw new ValidationError(
        `Gap in time wave coverage: ${coveredUntil} to ${start} minutes not covered`,
      );
    }
    if (start < coveredUntil) {
      throw new ValidationError(
        `Overlap in time wave config at minute ${start}`,
      );
    }
    coveredUntil = end;
  }
  if (coveredUntil !== 1440) {
    throw new ValidationError(
      `Time wave config must cover full 24 hours (covers until minute ${coveredUntil})`,
    );
  }
}

export async function getConfig(db: AppDb) {
  return configRepo.getPlatformConfig(db);
}

export async function updateTimeWaveConfig(db: AppDb, config: TimeWaveConfig) {
  validateTimeWaveCoverage(config);
  return configRepo.updateGlobalTimeWaveConfig(db, JSON.stringify(config), nowISO());
}

export async function getDashboardMetrics(db: AppDb) {
  const [totalFarms, totalMembers, activeSubscriptions] = await Promise.all([
    configRepo.countTotalFarms(db),
    configRepo.countTotalMembers(db),
    configRepo.countActiveSubscriptions(db),
  ]);

  return {
    totalFarms,
    totalMembers,
    activeSessionEstimate: activeSubscriptions,
    monthlyRevenue: 0, // TODO: calculate from invoices
  };
}
