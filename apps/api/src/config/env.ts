import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  APP_ORIGIN: z.string().url().default("http://localhost:3000"),
  APP_ORIGINS: z.string().optional(),
  AUTH_DB_URL: z.string().url(),
  CORE_DB_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, "JWT_SECRET deve ter ao menos 32 caracteres."),
  JWT_EXPIRES_IN: z.string().default("7d"),
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
