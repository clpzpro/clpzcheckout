import type { CreatePaymentSessionInput, GatewayProvider } from "@cpay/contracts";

export interface CreateGatewaySessionResult {
  providerSessionId: string;
  paymentUrl: string;
}

export interface PaymentGatewayAdapter {
  readonly provider: GatewayProvider;
  createSession(input: CreatePaymentSessionInput): Promise<CreateGatewaySessionResult>;
}
