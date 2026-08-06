import { generateId, nowISO, NotFoundError, ValidationError } from '@ai-farm/shared';
import type { AppDb } from '../../shared/db';
import * as planRepo from './plan-repository';
import type { CreatePlanInput, UpdatePlanInput } from './plan-schema';

export async function createPlan(db: AppDb, data: CreatePlanInput) {
  // Validate member ranges don't overlap with existing plans
  const existing = await planRepo.listPlans(db);
  for (const plan of existing) {
    const existingMax = plan.memberMax ?? Infinity;
    const newMax = data.memberMax ?? Infinity;
    if (data.memberMin <= existingMax && newMax >= plan.memberMin) {
      throw new ValidationError(
        `Member range [${data.memberMin}, ${data.memberMax ?? '∞'}] overlaps with plan "${plan.name}" [${plan.memberMin}, ${plan.memberMax ?? '∞'}]`,
      );
    }
  }

  const now = nowISO();
  return planRepo.createPlan(db, {
    id: generateId(),
    ...data,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updatePlan(db: AppDb, id: string, data: UpdatePlanInput) {
  const plan = await planRepo.getPlanById(db, id);
  if (!plan) throw new NotFoundError('Plan not found');

  return planRepo.updatePlan(db, id, {
    ...data,
    updatedAt: nowISO(),
  } as any);
}

export async function listPlans(db: AppDb) {
  return planRepo.listPlans(db);
}
