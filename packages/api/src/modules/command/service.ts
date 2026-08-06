import {
  generateId,
  nowISO,
  NotFoundError,
  ValidationError,
  COMMAND_STATUS_TRANSITIONS,
} from '@ai-farm/shared';
import type { CommandStatus } from '@ai-farm/shared';
import type { AppDb } from '../../shared/db';
import * as commandRepo from './repository';
import * as memberRepo from '../member/repository';
import type { SubmitCommandInput, CompleteCommandInput } from './schema';

function assertTransition(current: string, target: CommandStatus) {
  const allowed = COMMAND_STATUS_TRANSITIONS[current as CommandStatus];
  if (!allowed || !allowed.includes(target)) {
    throw new ValidationError(`Cannot transition from "${current}" to "${target}"`);
  }
}

/** Member submits a command — must have active binding to plot */
export async function submitCommand(
  db: AppDb,
  farmId: string,
  memberId: string,
  data: SubmitCommandInput,
) {
  // Validate member has active binding to this plot
  const binding = await memberRepo.findActiveBinding(db, memberId, data.plotId);
  if (!binding) {
    throw new ValidationError('Member has no active binding to this plot');
  }

  const now = nowISO();
  return commandRepo.create(db, {
    id: generateId(),
    farmId,
    memberId,
    plotId: data.plotId,
    type: data.type,
    description: data.description ?? null,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  });
}

/** Farm worker accepts a pending command */
export async function acceptCommand(
  db: AppDb,
  farmId: string,
  commandId: string,
  workerId: string,
) {
  const cmd = await commandRepo.getById(db, commandId, farmId);
  if (!cmd) throw new NotFoundError('Command not found');

  assertTransition(cmd.status, 'accepted');

  return commandRepo.updateStatus(db, commandId, farmId, {
    status: 'accepted',
    workerId,
    acceptedAt: nowISO(),
    updatedAt: nowISO(),
  });
}

/** Farm rejects a pending command */
export async function rejectCommand(
  db: AppDb,
  farmId: string,
  commandId: string,
  reason: string,
) {
  const cmd = await commandRepo.getById(db, commandId, farmId);
  if (!cmd) throw new NotFoundError('Command not found');

  assertTransition(cmd.status, 'rejected');

  return commandRepo.updateStatus(db, commandId, farmId, {
    status: 'rejected',
    rejectionReason: reason,
    updatedAt: nowISO(),
  });
}

/** Farm completes a command with receipt photos */
export async function completeCommand(
  db: AppDb,
  farmId: string,
  commandId: string,
  receiptPhotos: string[],
) {
  const cmd = await commandRepo.getById(db, commandId, farmId);
  if (!cmd) throw new NotFoundError('Command not found');

  assertTransition(cmd.status, 'done');

  const now = nowISO();

  // Create receipt records
  for (const photoUrl of receiptPhotos) {
    await commandRepo.addReceipt(db, {
      id: generateId(),
      commandId,
      farmId,
      photoUrl,
      createdAt: now,
    });
  }

  return commandRepo.updateStatus(db, commandId, farmId, {
    status: 'done',
    completedAt: now,
    updatedAt: now,
  });
}
