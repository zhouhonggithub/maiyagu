import { generateId, nowISO, NotFoundError, ValidationError, ConflictError } from '@ai-farm/shared';
import type { AppDb } from '../../shared/db';
import type { CreatePlotInput, UpdatePlotInput, GridSplitInput } from './schema';
import * as plotRepo from './repository';

type Point = [number, number];

/**
 * Create a plot. Validates polygon doesn't overlap existing plots in same zone.
 */
export async function createPlot(db: AppDb, farmId: string, data: CreatePlotInput) {
  // Check overlap if in a zone
  if (data.coverageZoneId) {
    const existing = await plotRepo.listByZone(db, farmId, data.coverageZoneId);
    for (const plot of existing) {
      const existingPoints: Point[] = JSON.parse(plot.polygonPoints);
      if (boundingBoxOverlap(data.polygonPoints as Point[], existingPoints)) {
        throw new ConflictError(`Plot overlaps with existing plot "${plot.code}"`);
      }
    }
  }

  const now = nowISO();
  const area = calculatePolygonArea(data.polygonPoints as Point[]);

  return plotRepo.create(db, {
    id: generateId(),
    farmId,
    coverageZoneId: data.coverageZoneId ?? null,
    name: data.name,
    code: data.code,
    polygonPoints: JSON.stringify(data.polygonPoints),
    areaSqm: area,
    soilType: data.soilType ?? null,
    irrigationType: data.irrigationType ?? null,
    status: 'vacant',
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * Grid split: generate R×C plots within a coverage zone, auto-dividing the zone polygon.
 * Codes are generated as A1, A2, ..., B1, B2, etc.
 */
export async function gridSplit(db: AppDb, farmId: string, data: GridSplitInput) {
  const { coverageZoneId, rows, cols } = data;

  // Get zone to obtain bounding box
  const existingPlots = await plotRepo.listByZone(db, farmId, coverageZoneId);
  if (existingPlots.length > 0) {
    throw new ConflictError('Zone already has plots. Delete existing plots before grid split.');
  }

  // For MVP, use a simple grid on [0,1]×[0,1] normalized coordinates
  const now = nowISO();
  const plotItems: plotRepo.CreatePlotData[] = [];

  const cellWidth = 1 / cols;
  const cellHeight = 1 / rows;

  for (let r = 0; r < rows; r++) {
    const rowLetter = String.fromCharCode(65 + r); // A, B, C...
    for (let col = 0; col < cols; col++) {
      const code = `${rowLetter}${col + 1}`;
      const x0 = col * cellWidth;
      const y0 = r * cellHeight;
      const x1 = x0 + cellWidth;
      const y1 = y0 + cellHeight;

      const polygon: Point[] = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
      const area = cellWidth * cellHeight;

      plotItems.push({
        id: generateId(),
        farmId,
        coverageZoneId,
        name: `Plot ${code}`,
        code,
        polygonPoints: JSON.stringify(polygon),
        areaSqm: area,
        soilType: null,
        irrigationType: null,
        status: 'vacant',
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  return plotRepo.batchInsert(db, plotItems);
}

/**
 * Update a plot.
 */
export async function updatePlot(db: AppDb, farmId: string, id: string, data: UpdatePlotInput) {
  const plot = await plotRepo.getById(db, id, farmId);
  if (!plot) throw new NotFoundError('Plot not found');

  const updateData: Record<string, unknown> = { updatedAt: nowISO() };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.code !== undefined) updateData.code = data.code;
  if (data.polygonPoints !== undefined) {
    updateData.polygonPoints = JSON.stringify(data.polygonPoints);
    updateData.areaSqm = calculatePolygonArea(data.polygonPoints as Point[]);
  }
  if (data.soilType !== undefined) updateData.soilType = data.soilType;
  if (data.irrigationType !== undefined) updateData.irrigationType = data.irrigationType;

  return plotRepo.update(db, id, farmId, updateData as any);
}

/**
 * Delete a plot.
 */
export async function deletePlot(db: AppDb, farmId: string, id: string) {
  const plot = await plotRepo.getById(db, id, farmId);
  if (!plot) throw new NotFoundError('Plot not found');
  await plotRepo.remove(db, id, farmId);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Simple bounding-box overlap detection (MVP).
 */
function boundingBoxOverlap(a: Point[], b: Point[]): boolean {
  const [aMinX, aMaxX, aMinY, aMaxY] = getBoundingBox(a);
  const [bMinX, bMaxX, bMinY, bMaxY] = getBoundingBox(b);

  return aMinX < bMaxX && aMaxX > bMinX && aMinY < bMaxY && aMaxY > bMinY;
}

function getBoundingBox(points: Point[]): [number, number, number, number] {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return [minX, maxX, minY, maxY];
}

/**
 * Polygon area using the Shoelace formula.
 */
function calculatePolygonArea(points: Point[]): number {
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
