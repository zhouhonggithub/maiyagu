export interface Env {
  // D1 Database
  DB: D1Database;
  // R2 Bucket
  R2: R2Bucket;
  // Queues
  FRAME_CAPTURE_QUEUE: Queue;
  LLM_ANALYSIS_QUEUE: Queue;
  NOTIFICATION_QUEUE: Queue;
  // Durable Objects
  PLOT_REALTIME: DurableObjectNamespace;
  FARM_SESSION: DurableObjectNamespace;
  // Secrets (set via wrangler secret)
  JWT_SECRET: string;
  EZVIZ_APP_KEY?: string;
  EZVIZ_APP_SECRET?: string;
  LLM_API_KEY?: string;
  WECHAT_APP_ID?: string;
  WECHAT_APP_SECRET?: string;
}

export type { AppDb } from './shared/db';
