import { z } from 'zod';

export const registerModelSchema = z.object({
  modelName: z.string().min(1).max(100),
  versionIdentifier: z.string().min(1).max(50),
  adapterType: z.enum(['qwen_vl', 'gpt4v', 'custom']),
  endpointUrl: z.string().url(),
  config: z.record(z.unknown()).optional(),
});

export type RegisterModelInput = z.infer<typeof registerModelSchema>;

export const setTestingSchema = z.object({
  testingPercentage: z.number().int().min(0).max(100),
});

export type SetTestingInput = z.infer<typeof setTestingSchema>;
