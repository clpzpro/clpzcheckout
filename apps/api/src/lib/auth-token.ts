import { SignJWT, jwtVerify } from "jose";
import { env } from "../config/env.js";

interface AuthTokenPayload {
  id: string;
  email: string;
  username: string;
}

const secret = new TextEncoder().encode(env.JWT_SECRET);

export async function signAuthToken(payload: AuthTokenPayload) {
  return new SignJWT({
    email: payload.email,
    username: payload.username
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.id)
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES_IN)
    .sign(secret);
}

export async function verifyAuthToken(token: string) {
  return jwtVerify(token, secret, {
    algorithms: ["HS256"]
  });
}
