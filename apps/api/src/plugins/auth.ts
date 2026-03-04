import fp from "fastify-plugin";
import type { FastifyReply, FastifyRequest } from "fastify";
import { verifyAuthToken } from "../lib/auth-token.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      username: string;
    };
  }

  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

function extractBearerToken(authorization?: string) {
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.replace("Bearer ", "").trim();
}

export const authPlugin = fp(async (app) => {
  app.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    const bearerToken = extractBearerToken(request.headers.authorization);
    const cookieToken = request.cookies.cpay_token;
    const token = bearerToken ?? cookieToken;

    if (!token) {
      reply.code(401).send({ message: "Nao autenticado." });
      return;
    }

    try {
      const { payload } = await verifyAuthToken(token);

      if (
        !payload.sub ||
        typeof payload.email !== "string" ||
        typeof payload.username !== "string"
      ) {
        reply.code(401).send({ message: "Token invalido." });
        return;
      }

      request.user = {
        id: payload.sub,
        email: payload.email,
        username: payload.username
      };
    } catch {
      reply.code(401).send({ message: "Token invalido ou expirado." });
    }
  });
});
