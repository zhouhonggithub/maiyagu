import { generateId, nowISO, NotFoundError } from '@ai-farm/shared';
import type { AppDb } from '../../shared/db';
import type { CreateAssetInput, UpdateAssetInput } from './asset-schema';
import * as assetRepo from './asset-repository';

interface AssetFile {
  name: string;
  arrayBuffer(): Promise<ArrayBuffer>;
  type: string;
}

/**
 * Upload an asset image to R2 and create a DB record.
 */
export async function uploadAsset(
  db: AppDb,
  r2: R2Bucket,
  file: AssetFile,
  metadata: CreateAssetInput,
) {
  const id = generateId();
  const key = `assets/${metadata.category}/${id}-${file.name}`;

  // Store image in R2
  const buffer = await file.arrayBuffer();
  await r2.put(key, buffer, { httpMetadata: { contentType: file.type } });

  const imageUrl = key; // Relative R2 key; resolve to full URL at API layer

  return assetRepo.create(db, {
    id,
    category: metadata.category,
    displayName: metadata.displayName,
    imageUrl,
    mappingKeywords: JSON.stringify(metadata.mappingKeywords),
    isDefault: metadata.isDefault ?? false,
    createdAt: nowISO(),
  });
}

/**
 * Update an existing asset's metadata.
 */
export async function updateAsset(db: AppDb, id: string, data: UpdateAssetInput) {
  const asset = await assetRepo.getById(db, id);
  if (!asset) throw new NotFoundError('Asset not found');

  const updateData: Record<string, unknown> = {};
  if (data.displayName !== undefined) updateData.displayName = data.displayName;
  if (data.mappingKeywords !== undefined) updateData.mappingKeywords = JSON.stringify(data.mappingKeywords);
  if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;

  return assetRepo.update(db, id, updateData as any);
}

/**
 * Delete asset from both R2 and DB.
 */
export async function deleteAsset(db: AppDb, r2: R2Bucket, id: string) {
  const asset = await assetRepo.getById(db, id);
  if (!asset) throw new NotFoundError('Asset not found');

  // Remove from R2
  await r2.delete(asset.imageUrl);
  // Remove DB record
  await assetRepo.remove(db, id);
}

/**
 * Match the best asset from a list based on keyword scoring against a detection label.
 * Returns the best match or a default asset for the category.
 */
export function matchAsset(
  assets: Array<{ id: string; mappingKeywords: string; isDefault: boolean | null }>,
  detection: string,
): string | null {
  const detectionLower = detection.toLowerCase();
  let bestScore = 0;
  let bestId: string | null = null;
  let defaultId: string | null = null;

  for (const asset of assets) {
    if (asset.isDefault) defaultId = asset.id;

    const keywords: string[] = JSON.parse(asset.mappingKeywords);
    let score = 0;
    for (const kw of keywords) {
      if (detectionLower.includes(kw.toLowerCase())) {
        score += kw.length; // Longer keyword matches score higher
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestId = asset.id;
    }
  }

  return bestId ?? defaultId;
}
