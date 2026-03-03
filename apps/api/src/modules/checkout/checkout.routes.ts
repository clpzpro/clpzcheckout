import type { FastifyInstance } from "fastify";
import {
  createCheckoutSchema,
  createPaymentSessionSchema
} from "@cpay/contracts";
import { coreDb } from "../../lib/db/core-db.js";

export async function checkoutRoutes(app: FastifyInstance) {
  app.post(
    "/v1/checkouts",
    {
      preHandler: [app.authenticate]
    },
    async (request, reply) => {
      const userId = request.user?.id;

      if (!userId) {
        return reply.code(401).send({ message: "Unauthorized" });
      }

      const parsed = createCheckoutSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.code(400).send({ message: "Invalid checkout payload", errors: parsed.error.flatten() });
      }

      const payload = parsed.data;

      const result = await coreDb.query(
        `
          INSERT INTO checkouts
            (owner_id, name, slug, currency, gateway_provider, theme, metadata)
          VALUES
            ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id, owner_id, name, slug, currency, gateway_provider, theme, metadata, created_at
        `,
        [
          userId,
          payload.name,
          payload.slug,
          payload.currency,
          payload.gatewayProvider,
          JSON.stringify(payload.theme),
          JSON.stringify(payload.metadata ?? {})
        ]
      );

      return reply.code(201).send(result.rows[0]);
    }
  );

  app.get(
    "/v1/checkouts",
    {
      preHandler: [app.authenticate]
    },
    async (request) => {
      const userId = request.user?.id;
      if (!userId) {
        return { items: [] };
      }

      const result = await coreDb.query(
        `
          SELECT id, name, slug, currency, gateway_provider, theme, metadata, created_at
          FROM checkouts
          WHERE owner_id = $1
          ORDER BY created_at DESC
        `,
        [userId]
      );

      return { items: result.rows };
    }
  );

  app.post(
    "/v1/checkouts/:checkoutId/payments",
    {
      preHandler: [app.authenticate]
    },
    async (request, reply) => {
      const userId = request.user?.id;

      if (!userId) {
        return reply.code(401).send({ message: "Unauthorized" });
      }

      const params = request.params as { checkoutId: string };
      const parsed = createPaymentSessionSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.code(400).send({ message: "Invalid payment payload", errors: parsed.error.flatten() });
      }

      const checkoutResult = await coreDb.query(
        `
          SELECT id, owner_id, gateway_provider
          FROM checkouts
          WHERE id = $1 AND owner_id = $2
          LIMIT 1
        `,
        [params.checkoutId, userId]
      );

      const checkout = checkoutResult.rows[0] as
        | { id: string; owner_id: string; gateway_provider: string }
        | undefined;

      if (!checkout) {
        return reply.code(404).send({ message: "Checkout not found" });
      }

      // Fase 1: sem integracao com gateways externos.
      return reply.code(501).send({
        message: "Integracao com gateway ainda nao foi habilitada nesta fase do Cpay.",
        checkoutId: checkout.id,
        provider: checkout.gateway_provider
      });
    }
  );
}
