import { Hono } from 'hono';
import { ValidationError } from '@ai-farm/shared';
import type { Env } from '../../env';
import { createDb } from '../../shared/db';
import { createAssetSchema, updateAssetSchema } from './asset-schema';
import * as assetService from './asset-service';
import * as assetRepo from './asset-repository';

const assetRoutes = new Hono<{ Bindings: Env }>();

/** GET /assets — List assets, optionally filtered by category */
assetRoutes.get('/', async (c) => {
  const category = c.req.query('category');
  const db = createDb(c.env.DB);
  const assets = category
    ? await assetRepo.listByCategory(db, category)
    : await assetRepo.listAll(db);
  return c.json({ success: true, data: assets });
});

/** POST /assets — Upload a new asset (multipart/form-data) */
assetRoutes.post('/', async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('file') as unknown as File | null;
  if (!file) {
    throw new ValidationError('File is required');
  }

  const metaRaw = {
    category: formData.get('category') as string,
    displayName: formData.get('displayName') as string,
    mappingKeywords: JSON.parse((formData.get('mappingKeywords') as string) || '[]'),
    isDefault: formData.get('isDefault') === 'true',
  };

  const result = createAssetSchema.safeParse(metaRaw);
  if (!result.success) {
    throw new ValidationError('Invalid asset metadata', result.error.flatten().fieldErrors);
  }

  const db = createDb(c.env.DB);
  const asset = await assetService.uploadAsset(db, c.env.R2, file, result.data);
  return c.json({ success: true, data: asset }, 201);
});

/** PUT /assets/:id — Update asset metadata */
assetRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const result = updateAssetSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError('Invalid asset data', result.error.flatten().fieldErrors);
  }

  const db = createDb(c.env.DB);
  const asset = await assetService.updateAsset(db, id, result.data);
  return c.json({ success: true, data: asset });
});

/** DELETE /assets/:id — Delete an asset */
assetRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const db = createDb(c.env.DB);
  await assetService.deleteAsset(db, c.env.R2, id);
  return c.json({ success: true, data: { message: 'Asset deleted' } });
});

export { assetRoutes };
