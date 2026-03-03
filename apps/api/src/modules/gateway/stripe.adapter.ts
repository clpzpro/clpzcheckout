import { randomUUID } from "node:crypto";
import type { CreatePaymentSessionInput } from "@cpay/contracts";
import type { CreateGatewaySessionResult, PaymentGatewayAdapter } from "./gateway.types.js";

export class StripeAdapter implements PaymentGatewayAdapter {
  public readonly provider = "stripe" as const;

  constructor(private readonly apiKey?: string) {}

  async createSession(_input: CreatePaymentSessionInput): Promise<CreateGatewaySessionResult> {
    if (!this.apiKey) {
      throw new Error("Stripe gateway not configured");
    }

    const providerSessionId = `st_${randomUUID()}`;

    return {
      providerSessionId,
      paymentUrl: `https://checkout.stripe.com/pay/${providerSessionId}`
    };
  }
}
