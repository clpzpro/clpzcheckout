import type { CreatePaymentSessionInput } from "@cpay/contracts";
import type { CreateGatewaySessionResult, PaymentGatewayAdapter } from "./gateway.types.js";

export class NoneAdapter implements PaymentGatewayAdapter {
  public readonly provider = "none" as const;

  async createSession(_input: CreatePaymentSessionInput): Promise<CreateGatewaySessionResult> {
    throw new Error("Gateway integration is disabled in phase 1");
  }
}
