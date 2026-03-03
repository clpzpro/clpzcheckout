import { z } from "zod";

// Fase 1 usa "none". Demais valores ficam reservados para fase 2.
export const gatewayProviderSchema = z.enum(["none", "stripe", "pagarme", "mercadopago"]);

export const checkoutThemeSchema = z.object({
  logoUrl: z.string().url().optional(),
  primaryColor: z.string().regex(/^#[A-Fa-f0-9]{6}$/),
  accentColor: z.string().regex(/^#[A-Fa-f0-9]{6}$/),
  buttonStyle: z.enum(["rounded", "square", "pill"]).default("rounded"),
  customCss: z.string().max(5000).optional()
});

export const createCheckoutSchema = z.object({
  name: z.string().min(3),
  slug: z.string().min(3).max(64).regex(/^[a-z0-9-]+$/),
  currency: z.string().length(3).default("BRL"),
  gatewayProvider: gatewayProviderSchema.default("none"),
  theme: checkoutThemeSchema,
  metadata: z.record(z.string(), z.string()).optional()
});

export const createPaymentSessionSchema = z.object({
  checkoutId: z.string().uuid(),
  amountInCents: z.number().int().positive(),
  customer: z.object({
    name: z.string().min(3),
    email: z.string().email(),
    document: z.string().min(11).max(18).optional()
  }),
  successUrl: z.string().url(),
  cancelUrl: z.string().url()
});

export type GatewayProvider = z.infer<typeof gatewayProviderSchema>;
export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
export type CreatePaymentSessionInput = z.infer<typeof createPaymentSessionSchema>;
export type CheckoutTheme = z.infer<typeof checkoutThemeSchema>;
