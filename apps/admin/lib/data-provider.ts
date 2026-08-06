import dataProvider from '@refinedev/simple-rest';
import { API_BASE_URL } from './api';

/**
 * Refine data provider wrapping our REST API.
 */
export const adminDataProvider = dataProvider(API_BASE_URL);
