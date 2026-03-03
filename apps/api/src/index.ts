import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./config/env.js";
import { authPlugin } from "./plugins/auth.js";
import { healthRoutes } from "./modules/health/health.routes.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { checkoutRoutes } from "./modules/checkout/checkout.routes.js";

async function bootstrap() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: [env.APP_ORIGIN],
    credentials: true
  });

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
