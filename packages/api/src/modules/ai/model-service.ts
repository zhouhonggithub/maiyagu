import { generateId, nowISO, NotFoundError, ConflictError } from '@ai-farm/shared';
import type { AppDb } from '../../shared/db';
import type { RegisterModelInput } from './model-schema';
import * as modelRepo from './model-repository';

/**
 * Register a new AI model version with 'testing' status.
 */
export async function register(db: AppDb, data: RegisterModelInput) {
  const now = nowISO();
  return modelRepo.create(db, {
    id: generateId(),
    modelName: data.modelName,
    versionIdentifier: data.versionIdentifier,
    adapterType: data.adapterType,
    endpointUrl: data.endpointUrl,
    status: 'testing',
    testingPercentage: 0,
    config: data.config ? JSON.stringify(data.config) : null,
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * Activate a model version. Deactivates the currently active version first.
 */
export async function activate(db: AppDb, id: string) {
  const model = await modelRepo.getById(db, id);
  if (!model) throw new NotFoundError('Model version not found');
  if (model.status === 'active') throw new ConflictError('Model is already active');

  // Deactivate current active model(s)
  const activeModels = await modelRepo.getByStatus(db, 'active');
  const now = nowISO();
  for (const active of activeModels) {
    await modelRepo.updateStatus(db, active.id, 'deprecated', now);
  }

  return modelRepo.updateStatus(db, id, 'active', now);
}

/**
 * Deprecate a model version.
 */
export async function deprecate(db: AppDb, id: string) {
  const model = await modelRepo.getById(db, id);
  if (!model) throw new NotFoundError('Model version not found');
  return modelRepo.updateStatus(db, id, 'deprecated', nowISO());
}

/**
 * Set testing traffic percentage for a model version.
 */
export async function setTesting(db: AppDb, id: string, percentage: number) {
  const model = await modelRepo.getById(db, id);
  if (!model) throw new NotFoundError('Model version not found');
  return modelRepo.updateTestingPercentage(db, id, percentage, nowISO());
}

/**
 * Select model for inference using routing logic:
 * - If a testing model exists, route by percentage
 * - Otherwise use the active model
 */
export async function selectModel(db: AppDb) {
  const activeModels = await modelRepo.getByStatus(db, 'active');
  const testingModels = await modelRepo.getByStatus(db, 'testing');

  // Find testing model with percentage > 0
  const testingModel = testingModels.find((m) => (m.testingPercentage ?? 0) > 0);

  if (testingModel && Math.random() * 100 < (testingModel.testingPercentage ?? 0)) {
    return testingModel;
  }

  if (activeModels.length > 0) {
    return activeModels[0];
  }

  return null;
}
