import { generateId, nowISO, ValidationError, MEDIA_LIMITS } from '@ai-farm/shared';
import type { AppDb } from '../../shared/db';
import * as mediaRepo from './repository';
import type { CreateMediaInput, CreateGrowthLogInput } from './schema';

/**
 * Generate a presigned URL for R2 upload.
 * Path format: farms/{farmId}/media/{plotId?}/{timestamp}_{filename}
 */
export async function generatePresignedUrl(
  r2: R2Bucket,
  farmId: string,
  plotId: string | undefined,
  filename: string,
  mimeType: string,
) {
  if (!MEDIA_LIMITS.allowedMimeTypes.includes(mimeType as any)) {
    throw new ValidationError(`Unsupported mime type: ${mimeType}`);
  }

  const pathSegments = ['farms', farmId, 'media'];
  if (plotId) pathSegments.push(plotId);
  pathSegments.push(`${Date.now()}_${filename}`);
  const key = pathSegments.join('/');

  // Use R2 multipart or direct put — return the key and a presigned-style URL
  // For CF Workers R2, we generate the key and client PUTs via worker proxy
  const url = `/api/media/upload/${key}`;

  return { key, url, mimeType };
}

/**
 * Create a media record after upload is confirmed.
 */
export async function createMediaRecord(
  db: AppDb,
  farmId: string,
  data: CreateMediaInput,
) {
  // Validate mime type
  if (!MEDIA_LIMITS.allowedMimeTypes.includes(data.mimeType as any)) {
    throw new ValidationError(`Unsupported mime type: ${data.mimeType}`);
  }

  // Validate size limits
  const isVideo = data.mimeType.startsWith('video/');
  const maxBytes = isVideo ? MEDIA_LIMITS.videoMaxBytes : MEDIA_LIMITS.imageMaxBytes;
  if (data.sizeBytes > maxBytes) {
    throw new ValidationError(
      `File size ${data.sizeBytes} exceeds limit of ${maxBytes} bytes`,
    );
  }

  return mediaRepo.createMedia(db, {
    id: generateId(),
    farmId,
    plotId: data.plotId ?? null,
    type: data.type,
    url: data.url,
    thumbnailUrl: data.thumbnailUrl ?? null,
    caption: data.caption ?? null,
    source: data.source,
    mimeType: data.mimeType,
    sizeBytes: data.sizeBytes,
    takenAt: data.takenAt,
    createdAt: nowISO(),
  });
}

/**
 * Create a growth log entry.
 */
export async function createGrowthLog(
  db: AppDb,
  farmId: string,
  data: CreateGrowthLogInput,
) {
  return mediaRepo.createGrowthLog(db, {
    id: generateId(),
    farmId,
    plotId: data.plotId,
    date: data.date,
    title: data.title,
    content: data.content ?? null,
    eventType: data.eventType,
    mediaIds: data.mediaIds ? JSON.stringify(data.mediaIds) : null,
    createdAt: nowISO(),
  });
}
