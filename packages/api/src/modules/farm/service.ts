import { generateId, nowISO, NotFoundError, ValidationError } from '@ai-farm/shared';
import { FARM_STATUS_TRANSITIONS } from '@ai-farm/shared';
import type { FarmStatus } from '@ai-farm/shared';
import type { AppDb } from '../../shared/db';
import * as farmRepo from './repository';
import type { FarmApplicationInput, FarmTimeWaveOverrideInput } from './schema';

function validateTransition(current: FarmStatus, target: FarmStatus) {
  const allowed = FARM_STATUS_TRANSITIONS[current];
  if (!allowed || !allowed.includes(target)) {
    throw new ValidationError(
      `Cannot transition farm from '${current}' to '${target}'`,
    );
  }
}

export async function createFarmApplication(
  db: AppDb,
  ownerId: string,
  data: FarmApplicationInput,
) {
  const now = nowISO();
  return farmRepo.createFarm(db, {
    id: generateId(),
    name: data.name,
    ownerId,
    province: data.province,
    city: data.city,
    district: data.district,
    address: data.address ?? null,
    areaSqm: data.areaSqm ?? null,
    description: data.description ?? null,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  });
}

export async function approveFarm(db: AppDb, farmId: string) {
  const farm = await farmRepo.getFarmById(db, farmId);
  if (!farm) throw new NotFoundError('Farm not found');
  validateTransition(farm.status as FarmStatus, 'active');
  return farmRepo.updateFarmStatus(db, farmId, 'active', nowISO());
}

export async function suspendFarm(db: AppDb, farmId: string) {
  const farm = await farmRepo.getFarmById(db, farmId);
  if (!farm) throw new NotFoundError('Farm not found');
  validateTransition(farm.status as FarmStatus, 'suspended');
  return farmRepo.updateFarmStatus(db, farmId, 'suspended', nowISO());
}

export async function deleteFarm(db: AppDb, farmId: string) {
  const farm = await farmRepo.getFarmById(db, farmId);
  if (!farm) throw new NotFoundError('Farm not found');
  validateTransition(farm.status as FarmStatus, 'deleted');
  return farmRepo.softDeleteFarm(db, farmId, nowISO());
}

export async function assignPlan(db: AppDb, farmId: string, planId: string) {
  const farm = await farmRepo.getFarmById(db, farmId);
  if (!farm) throw new NotFoundError('Farm not found');
  return farmRepo.updateFarmPlan(db, farmId, planId, nowISO());
}

export async function setTimeWaveOverride(
  db: AppDb,
  farmId: string,
  config: FarmTimeWaveOverrideInput['timeWaveConfig'],
) {
  const farm = await farmRepo.getFarmById(db, farmId);
  if (!farm) throw new NotFoundError('Farm not found');
  return farmRepo.updateFarmTimeWaveOverride(db, farmId, JSON.stringify(config), nowISO());
}

export async function getFarmDashboard(db: AppDb, farmId: string) {
  const farm = await farmRepo.getFarmById(db, farmId);
  if (!farm) throw new NotFoundError('Farm not found');
  const memberCount = await farmRepo.countFarmMembers(db, farmId);
  return {
    farm,
    memberCount,
  };
}
