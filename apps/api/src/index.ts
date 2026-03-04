import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import { env } from "./config/env.js";
import { authPlugin } from "./plugins/auth.js";
import { healthRoutes } from "./modules/health/health.routes.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { checkoutRoutes } from "./modules/checkout/checkout.routes.js";
import { ensureAuthSchema } from "./lib/db/ensure-auth-schema.js";

function buildAllowedOrigins() {
  const base = new Set<string>();

  function addOrigin(rawOrigin: string) {
    try {
      const normalized = new URL(rawOrigin).origin;
      base.add(normalized);
    } catch {
      // ignora origin invalida
    }
  }

  addOrigin(env.APP_ORIGIN);

  if (env.APP_ORIGINS) {
    for (const item of env.APP_ORIGINS.split(",")) {
      const trimmed = item.trim();
      if (trimmed) {
        addOrigin(trimmed);
      }
    }
  }

  for (const origin of Array.from(base)) {
    try {
      const url = new URL(origin);

      if (url.hostname.startsWith("www.")) {
        url.hostname = url.hostname.replace(/^www\./, "");
        base.add(url.origin);
      } else {
        const withWww = new URL(origin);
        withWww.hostname = `www.${withWww.hostname}`;
        base.add(withWww.origin);
      }
    } catch {
      // ignora origin invalida
    }
  }

  return Array.from(base);
}

async function bootstrap() {
  const app = Fastify({
    logger: true,
    trustProxy: true,
    bodyLimit: 1024 * 1024
  });
  const allowedOrigins = buildAllowedOrigins();
  const allowedOriginSet = new Set(allowedOrigins);

  await app.register(cors, {
    origin: allowedOrigins,
    credentials: true
  });
  await app.register(cookie);

  app.addHook("onRequest", async (request, reply) => {
    const method = request.method.toUpperCase();
    const hasStateChange = method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";

    if (!hasStateChange) {
      return;
    }

    const originHeader = request.headers.origin;

    if (originHeader) {
      let normalizedOrigin: string;

      try {
        normalizedOrigin = new URL(originHeader).origin;
      } catch {
        return reply.code(403).send({ message: "Origem invalida." });
      }

      if (!allowedOriginSet.has(normalizedOrigin)) {
        return reply.code(403).send({ message: "Origem nao permitida." });
      }
    }

    const fetchSite = request.headers["sec-fetch-site"];
    if (fetchSite === "cross-site") {
      return reply.code(403).send({ message: "Requisicao cross-site bloqueada." });
    }
  });

  app.addHook("onSend", async (_request, reply, payload) => {
    reply.removeHeader("server");
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("Referrer-Policy", "same-origin");
    reply.header("Permissions-Policy", "camera=(), geolocation=(), microphone=()");
    reply.header("Cross-Origin-Opener-Policy", "same-origin");
    reply.header("Cross-Origin-Resource-Policy", "same-site");

    if (env.NODE_ENV === "production") {
      reply.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }

    return payload;
  });

  await ensureAuthSchema();
  await app.register(authPlugin);
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(checkoutRoutes);

  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void bootstrap();
