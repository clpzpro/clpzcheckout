import { compare, hash } from "bcryptjs";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { env } from "../../config/env.js";
import { signAuthToken } from "../../lib/auth-token.js";
import { authDb } from "../../lib/db/auth-db.js";
import {
  getCaptchaClientKey,
  issueCaptchaForClient,
  verifyCaptchaForClient
} from "./captcha.service.js";

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,24}$/, "Username deve ter 3 a 24 caracteres (a-z, 0-9 ou _).");

const checkAvailabilitySchema = z.object({
  email: z.string().trim().email(),
  username: usernameSchema
});

const registerSchema = z.object({
  email: z.string().trim().email(),
  username: usernameSchema,
  password: z.string().min(8).max(120),
  captchaId: z.string().uuid(),
  captchaAnswer: z.string().trim().min(1).max(24)
});

const loginSchema = z.object({
  identifier: z.string().trim().min(3).max(120),
  password: z.string().min(8).max(120)
});

const authCookie = "cpay_token";

const authCookieOptions = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 7
};

export async function authRoutes(app: FastifyInstance) {
  app.get("/v1/auth/captcha/challenge", async (request, reply) => {
    const clientKey = getCaptchaClientKey(request);
    const challengeResult = issueCaptchaForClient(clientKey);

    if (challengeResult.status === "locked") {
      return reply.code(429).send({
        message: "Muitas tentativas. Aguarde 5 minutos para tentar novamente.",
        code: "CAPTCHA_LOCKED",
        lockedUntil: challengeResult.lockedUntil
      });
    }

    return {
      challengeId: challengeResult.challengeId,
      prompt: challengeResult.prompt,
      attemptsLeft: challengeResult.attemptsLeft,
      expiresAt: challengeResult.expiresAt
    };
  });

  app.post("/v1/auth/check-availability", async (request, reply) => {
    const parsed = checkAvailabilitySchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Payload invalido", errors: parsed.error.flatten() });
    }

    const result = await authDb.query(
      `
        SELECT
          EXISTS (
            SELECT 1
            FROM auth_users
            WHERE LOWER(email) = LOWER($1)
          ) AS email_exists,
          EXISTS (
            SELECT 1
            FROM auth_users
            WHERE LOWER(username) = LOWER($2)
          ) AS username_exists
      `,
      [parsed.data.email, parsed.data.username]
    );

    const row = result.rows[0] as { email_exists: boolean; username_exists: boolean };

    return {
      emailExists: row.email_exists,
      usernameExists: row.username_exists
    };
  });

  app.post("/v1/auth/register", async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Payload invalido", errors: parsed.error.flatten() });
    }

    const email = parsed.data.email.trim().toLowerCase();
    const username = parsed.data.username.trim().toLowerCase();
    const clientKey = getCaptchaClientKey(request);
    const captchaResult = verifyCaptchaForClient(
      clientKey,
      parsed.data.captchaId,
      parsed.data.captchaAnswer
    );

    if (captchaResult.status === "locked") {
      return reply.code(429).send({
        message: "Muitas tentativas no captcha. Aguarde 5 minutos.",
        code: "CAPTCHA_LOCKED",
        lockedUntil: captchaResult.lockedUntil
      });
    }

    if (captchaResult.status === "invalid") {
      return reply.code(400).send({
        message: "Captcha invalido.",
        code: "CAPTCHA_INVALID",
        attemptsLeft: captchaResult.attemptsLeft
      });
    }

    const conflictCheck = await authDb.query(
      `
        SELECT
          EXISTS (
            SELECT 1
            FROM auth_users
            WHERE LOWER(email) = LOWER($1)
          ) AS email_exists,
          EXISTS (
            SELECT 1
            FROM auth_users
            WHERE LOWER(username) = LOWER($2)
          ) AS username_exists
      `,
      [email, username]
    );

    const conflict = conflictCheck.rows[0] as { email_exists: boolean; username_exists: boolean };

    if (conflict.email_exists) {
      return reply.code(409).send({ message: "Este email ja possui conta." });
    }

    if (conflict.username_exists) {
      return reply.code(409).send({ message: "Este username ja esta em uso." });
    }

    const passwordHash = await hash(parsed.data.password, 12);

    let createUserResult;

    try {
      createUserResult = await authDb.query(
        `
          INSERT INTO auth_users (email, username, password_hash, last_login_at)
          VALUES ($1, $2, $3, NOW())
          RETURNING id, email, username, created_at, last_login_at
        `,
        [email, username, passwordHash]
      );
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
        return reply.code(409).send({ message: "Email ou username ja esta em uso." });
      }

      throw error;
    }

    const user = createUserResult.rows[0] as {
      id: string;
      email: string;
      username: string;
      created_at: string;
      last_login_at: string;
    };

    const token = await signAuthToken({
      id: user.id,
      email: user.email,
      username: user.username
    });

    reply.setCookie(authCookie, token, authCookieOptions);

    return reply.code(201).send({ user });
  });

  app.post("/v1/auth/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ message: "Payload invalido", errors: parsed.error.flatten() });
    }

    const identifier = parsed.data.identifier.trim().toLowerCase();

    const userQuery = await authDb.query(
      `
        SELECT id, email, username, password_hash, created_at, last_login_at
        FROM auth_users
        WHERE
          CASE
            WHEN POSITION('@' IN $1) > 0 THEN LOWER(email) = LOWER($1)
            ELSE LOWER(username) = LOWER($1)
          END
        LIMIT 1
      `,
      [identifier]
    );

    const userRow = userQuery.rows[0] as
      | {
          id: string;
          email: string;
          username: string;
          password_hash: string;
          created_at: string;
          last_login_at: string;
        }
      | undefined;

    if (!userRow) {
      return reply.code(401).send({ message: "Credenciais invalidas." });
    }

    const isPasswordValid = await compare(parsed.data.password, userRow.password_hash);

    if (!isPasswordValid) {
      return reply.code(401).send({ message: "Credenciais invalidas." });
    }

    const updateResult = await authDb.query(
      `
        UPDATE auth_users
        SET last_login_at = NOW()
        WHERE id = $1
        RETURNING id, email, username, created_at, last_login_at
      `,
      [userRow.id]
    );

    const user = updateResult.rows[0] as {
      id: string;
      email: string;
      username: string;
      created_at: string;
      last_login_at: string;
    };

    const token = await signAuthToken({
      id: user.id,
      email: user.email,
      username: user.username
    });

    reply.setCookie(authCookie, token, authCookieOptions);

    return { user };
  });

  app.post("/v1/auth/logout", async (_request, reply) => {
    reply.clearCookie(authCookie, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production"
    });

    return reply.code(204).send();
  });

  app.get(
    "/v1/auth/me",
    {
      preHandler: [app.authenticate]
    },
    async (request, reply) => {
      const userId = request.user?.id;

      if (!userId) {
        return reply.code(401).send({ message: "Nao autenticado." });
      }

      const userResult = await authDb.query(
        `
          SELECT id, email, username, created_at, last_login_at
          FROM auth_users
          WHERE id = $1
          LIMIT 1
        `,
        [userId]
      );

      const user = userResult.rows[0];

      if (!user) {
        return reply.code(401).send({ message: "Usuario nao encontrado." });
      }

      return { user };
    }
  );
}
