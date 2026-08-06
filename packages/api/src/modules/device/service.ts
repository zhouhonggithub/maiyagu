import { generateId, nowISO, NotFoundError } from '@ai-farm/shared';
import type { AppDb } from '../../shared/db';
import type { CreateCameraInput, UpdateCameraInput } from './schema';
import * as cameraRepo from './repository';

/**
 * Add a new camera to a farm.
 */
export async function addCamera(db: AppDb, farmId: string, data: CreateCameraInput) {
  const now = nowISO();
  return cameraRepo.create(db, {
    id: generateId(),
    farmId,
    name: data.name,
    protocol: data.protocol,
    streamUrl: data.streamUrl ?? null,
    deviceSerial: data.deviceSerial ?? null,
    credentials: data.credentials ? JSON.stringify(data.credentials) : null,
    status: 'offline',
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * Update camera metadata.
 */
export async function updateCamera(db: AppDb, farmId: string, id: string, data: UpdateCameraInput) {
  const camera = await cameraRepo.getById(db, id, farmId);
  if (!camera) throw new NotFoundError('Camera not found');

  const updateData: Record<string, unknown> = { updatedAt: nowISO() };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.streamUrl !== undefined) updateData.streamUrl = data.streamUrl;
  if (data.credentials !== undefined) updateData.credentials = JSON.stringify(data.credentials);

  return cameraRepo.update(db, id, farmId, updateData as any);
}

/**
 * Test camera connectivity. Placeholder — returns mock success.
 */
export async function testConnectivity(db: AppDb, farmId: string, id: string) {
  const camera = await cameraRepo.getById(db, id, farmId);
  if (!camera) throw new NotFoundError('Camera not found');

  // TODO: Implement real connectivity check per protocol
  return { success: true, latencyMs: 42, message: 'Connection successful (mock)' };
}

/**
 * Update camera heartbeat timestamp and status.
 */
export async function updateHeartbeat(db: AppDb, farmId: string, id: string) {
  const camera = await cameraRepo.getById(db, id, farmId);
  if (!camera) throw new NotFoundError('Camera not found');

  return cameraRepo.update(db, id, farmId, {
    status: 'online',
    lastHeartbeat: nowISO(),
    updatedAt: nowISO(),
  });
}

/**
 * List all cameras for a farm.
 */
export async function listCameras(db: AppDb, farmId: string) {
  return cameraRepo.listByFarm(db, farmId);
}

/**
 * Delete a camera.
 */
export async function deleteCamera(db: AppDb, farmId: string, id: string) {
  const camera = await cameraRepo.getById(db, id, farmId);
  if (!camera) throw new NotFoundError('Camera not found');
  await cameraRepo.remove(db, id, farmId);
}
