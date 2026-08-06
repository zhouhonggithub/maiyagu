import dataProvider from '@refinedev/simple-rest';
import { API_BASE_URL, getAuthHeaders } from './api';

/**
 * Refine data provider wrapping our REST API.
 * Injects auth headers into every request automatically.
 */
export const adminDataProvider = dataProvider(API_BASE_URL, {
  headers: () => getAuthHeaders(),
});
