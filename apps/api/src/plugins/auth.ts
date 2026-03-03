import fp from "fastify-plugin";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../config/env.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: {
      id: string;
      email?: string;
      raw: JWTPayload;
    };
  }

  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const jwks = createRemoteJWKSet(new URL(env.SUPABASE_JWKS_URL));

export const authPlugin = fp(async (app) => {
  app.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      reply.code(401).send({ message: "Missing bearer token" });
      return;
    }

    const token = authHeader.replace("Bearer ", "").trim();

    try {
      const { payload } = await jwtVerify(token, jwks, {
        issuer: env.SUPABASE_ISSUER,
        audience: env.SUPABASE_AUDIENCE
      });

      if (!payload.sub) {
        reply.code(401).send({ message: "Invalid token payload" });
        return;
      }

      request.user = {
        id: payload.sub,
        email: typeof payload.email === "string" ? payload.email : undefined,
        raw: payload
      };
    } catch {
      reply.code(401).send({ message: "Invalid or expired token" });
    }
  });
});
