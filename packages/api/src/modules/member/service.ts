import {
  generateId,
  nowISO,
  NotFoundError,
  ConflictError,
  ValidationError,
  validateTimeWaveConfig,
} from '@ai-farm/shared';
import type { AppDb } from '../../shared/db';
import * as memberRepo from './repository';
import type { CreateMemberInput, UpdateMemberInput, MemberScheduleInput } from './schema';

export async function addMember(
  db: AppDb,
  farmId: string,
  userId: string,
  data: CreateMemberInput,
) {
  const now = nowISO();
  return memberRepo.create(db, {
    id: generateId(),
    farmId,
    userId,
    nickname: data.nickname,
    phone: data.phone ?? null,
    subscriptionStart: data.subscriptionStart,
    subscriptionEnd: data.subscriptionEnd,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateMember(
  db: AppDb,
  farmId: string,
  id: string,
  data: UpdateMemberInput,
) {
  const member = await memberRepo.getById(db, farmId, id);
  if (!member) throw new NotFoundError('Member not found');
  return memberRepo.update(db, farmId, id, { ...data, updatedAt: nowISO() });
}

export async function bindToPlot(
  db: AppDb,
  farmId: string,
  memberId: string,
  plotId: string,
) {
  const member = await memberRepo.getById(db, farmId, memberId);
  if (!member) throw new NotFoundError('Member not found');

  const existing = await memberRepo.findActiveBinding(db, memberId, plotId);
  if (existing) throw new ConflictError('Member is already bound to this plot');

  return memberRepo.createBinding(db, {
    id: generateId(),
    memberId,
    plotId,
    farmId,
    boundAt: nowISO(),
  });
}

export async function unbindFromPlot(
  db: AppDb,
  farmId: string,
  memberId: string,
  plotId: string,
) {
  const member = await memberRepo.getById(db, farmId, memberId);
  if (!member) throw new NotFoundError('Member not found');

  const binding = await memberRepo.findActiveBinding(db, memberId, plotId);
  if (!binding) throw new NotFoundError('No active binding found for this plot');

  return memberRepo.unbind(db, binding.id, nowISO());
}

export async function setSchedule(
  db: AppDb,
  farmId: string,
  memberId: string,
  config: MemberScheduleInput['timeWaveConfig'],
) {
  const member = await memberRepo.getById(db, farmId, memberId);
  if (!member) throw new NotFoundError('Member not found');

  const validation = validateTimeWaveConfig(config);
  if (!validation.valid) {
    throw new ValidationError(validation.error ?? 'Invalid time wave config');
  }

  return memberRepo.update(db, farmId, memberId, {
    timeWaveConfig: JSON.stringify(config),
    updatedAt: nowISO(),
  });
}

export function checkExpiry(subscriptionEnd: string): boolean {
  return new Date(subscriptionEnd) < new Date();
}
