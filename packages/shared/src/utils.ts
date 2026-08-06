import { nanoid } from 'nanoid';
import type { PaginationMeta } from './types.js';

/**
 * Generate a unique ID using nanoid (21 characters).
 */
export function generateId(): string {
  return nanoid(21);
}

/**
 * Return the current timestamp in ISO 8601 format.
 */
export function nowISO(): string {
  return new Date().toISOString();
}

/**
 * Calculate pagination metadata from total count, current page, and page size.
 */
export function calculatePagination(
  total: number,
  page: number,
  pageSize: number,
): PaginationMeta {
  const totalPages = Math.ceil(total / pageSize);
  return {
    page,
    pageSize,
    total,
    totalPages,
  };
}
