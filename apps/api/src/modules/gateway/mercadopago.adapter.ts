import { randomUUID } from "node:crypto";
import type { CreatePaymentSessionInput } from "@cpay/contracts";
import type { CreateGatewaySessionResult, PaymentGatewayAdapter } from "./gateway.types.js";

export class MercadoPagoAdapter implements PaymentGatewayAdapter {
  public readonly provider = "mercadopago" as const;

  constructor(private readonly accessToken?: string) {}

  async createSession(_input: CreatePaymentSessionInput): Promise<CreateGatewaySessionResult> {
    if (!this.accessToken) {
      throw new Error("Mercado Pago gateway not configured");
    }

    const providerSessionId = `mp_${randomUUID()}`;

    return {
      providerSessionId,
      paymentUrl: `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=${providerSessionId}`
    };
  }
}
