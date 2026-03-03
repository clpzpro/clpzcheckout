import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  APP_ORIGIN: z.string().url().default("http://localhost:3000"),
  AUTH_DB_URL: z.string().url(),
  CORE_DB_URL: z.string().url(),
  SUPABASE_JWKS_URL: z.string().url(),
  SUPABASE_ISSUER: z.string().url(),
  SUPABASE_AUDIENCE: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().optional(),
  PAGARME_SECRET_KEY: z.string().optional(),
  MERCADOPAGO_SECRET_KEY: z.string().optional()
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
