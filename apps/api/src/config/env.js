import 'dotenv/config';
import { z } from 'zod';

const configSchema = z.object({
  DATABASE_URL: z.string().min(1),
  API_PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
  PUBLIC_WEB_URL: z.string().url().default('http://localhost:5173'),
  JWT_SECRET: z.string().min(32),
  VOUCHER_SECRET: z.string().min(32),
  MOCK_PAYMENTS_ENABLED: z.enum(['true','false']).default('true').transform(v=>v==='true'),
  NODE_ENV: z.enum(['development','test','production']).default('development')
});
export const env = configSchema.parse(process.env);
