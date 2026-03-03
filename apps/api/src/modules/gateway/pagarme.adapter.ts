import { randomUUID } from "node:crypto";
import type { CreatePaymentSessionInput } from "@cpay/contracts";
import type { CreateGatewaySessionResult, PaymentGatewayAdapter } from "./gateway.types.js";

export class PagarmeAdapter implements PaymentGatewayAdapter {
  public readonly provider = "pagarme" as const;

  constructor(private readonly apiKey?: string) {}

  async createSession(_input: CreatePaymentSessionInput): Promise<CreateGatewaySessionResult> {
    if (!this.apiKey) {
      throw new Error("Pagar.me gateway not configured");
    }

    const providerSessionId = `pgm_${randomUUID()}`;

    return {
      providerSessionId,
      paymentUrl: `https://api.pagar.me/core/v5/orders/${providerSessionId}`
    };
  }
}
