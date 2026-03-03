import type { GatewayProvider } from "@cpay/contracts";
import { env } from "../../config/env.js";
import type { PaymentGatewayAdapter } from "./gateway.types.js";
import { StripeAdapter } from "./stripe.adapter.js";
import { PagarmeAdapter } from "./pagarme.adapter.js";
import { MercadoPagoAdapter } from "./mercadopago.adapter.js";
import { NoneAdapter } from "./none.adapter.js";

export class GatewayRegistry {
  private readonly registry: Record<GatewayProvider, PaymentGatewayAdapter>;

  constructor() {
    this.registry = {
      none: new NoneAdapter(),
      stripe: new StripeAdapter(env.STRIPE_SECRET_KEY),
      pagarme: new PagarmeAdapter(env.PAGARME_SECRET_KEY),
      mercadopago: new MercadoPagoAdapter(env.MERCADOPAGO_SECRET_KEY)
    };
  }

  get(provider: GatewayProvider): PaymentGatewayAdapter {
    return this.registry[provider];
  }
}
