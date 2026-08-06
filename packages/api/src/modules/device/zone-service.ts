import { generateId, nowISO, NotFoundError, ValidationError } from '@ai-farm/shared';
import type { AppDb } from '../../shared/db';
import type { CreateZoneInput, UpdateZoneInput } from './zone-schema';
import * as zoneRepo from './zone-repository';

type Point = [number, number];

/**
 * Create a coverage zone. Validates polygon points are within frame bounds (0-1 normalized).
 */
export async function createZone(db: AppDb, farmId: string, data: CreateZoneInput) {
  validatePolygonBounds(data.polygonPoints as Point[]);

  const now = nowISO();
  const area = calculateArea(data.polygonPoints as Point[]);

  return zoneRepo.create(db, {
    id: generateId(),
    farmId,
    cameraId: data.cameraId,
    name: data.name,
    polygonPoints: JSON.stringify(data.polygonPoints),
    areaSqm: area,
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * Update a coverage zone.
 */
export async function updateZone(db: AppDb, farmId: string, id: string, data: UpdateZoneInput) {
  const zone = await zoneRepo.getById(db, id, farmId);
  if (!zone) throw new NotFoundError('Coverage zone not found');

  const updateData: Record<string, unknown> = { updatedAt: nowISO() };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.polygonPoints !== undefined) {
    validatePolygonBounds(data.polygonPoints as Point[]);
    updateData.polygonPoints = JSON.stringify(data.polygonPoints);
    updateData.areaSqm = calculateArea(data.polygonPoints as Point[]);
  }

  return zoneRepo.update(db, id, farmId, updateData as any);
}

/**
 * Delete a coverage zone.
 */
export async function deleteZone(db: AppDb, farmId: string, id: string) {
  const zone = await zoneRepo.getById(db, id, farmId);
  if (!zone) throw new NotFoundError('Coverage zone not found');
  await zoneRepo.remove(db, id, farmId);
}

/**
 * Calculate polygon area using the Shoelace formula (in normalized frame coordinates).
 */
export function calculateArea(points: Point[]): number {
  const n = points.length;
  if (n < 3) return 0;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i][0] * points[j][1];
    area -= points[j][0] * points[i][1];
  }
  return Math.abs(area) / 2;
}

/**
 * Validate all polygon points are within normalized frame bounds [0, 1].
 */
function validatePolygonBounds(points: Point[]) {
  for (const [x, y] of points) {
    if (x < 0 || x > 1 || y < 0 || y > 1) {
      throw new ValidationError('Polygon points must be within frame bounds (0-1)');
    }
  }
}
