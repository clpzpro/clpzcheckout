import type { FastifyInstance } from "fastify";
import { authDb } from "../../lib/db/auth-db.js";

export async function authRoutes(app: FastifyInstance) {
  app.get(
    "/v1/auth/me",
    {
      preHandler: [app.authenticate]
    },
    async (request, reply) => {
      const userId = request.user?.id;
      const email = request.user?.email;

      if (!userId) {
        return reply.code(401).send({ message: "Unauthorized" });
      }

      const profileResult = await authDb.query(
        `
          INSERT INTO user_profiles (id, email, last_login_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (id)
          DO UPDATE SET email = EXCLUDED.email, last_login_at = NOW()
          RETURNING id, email, created_at, last_login_at
        `,
        [userId, email]
      );

      return {
        user: profileResult.rows[0],
        claims: request.user?.raw
      };
    }
  );
}
