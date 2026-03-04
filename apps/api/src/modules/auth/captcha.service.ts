import { randomInt, randomUUID } from "node:crypto";
import type { FastifyRequest } from "fastify";

const CAPTCHA_MAX_ATTEMPTS = 3;
const CAPTCHA_LOCK_MS = 5 * 60 * 1000;
const CAPTCHA_TTL_MS = 2 * 60 * 1000;
const CAPTCHA_CODE_LENGTH = 6;
const CAPTCHA_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

interface CaptchaChallengeState {
  id: string;
  prompt: string;
  displayText: string;
  answer: string;
  expiresAt: number;
}

interface CaptchaClientState {
  failedAttempts: number;
  lockedUntil: number;
  challenge?: CaptchaChallengeState;
}

const captchaState = new Map<string, CaptchaClientState>();

type CaptchaIssueResult =
  | {
      status: "locked";
      lockedUntil: number;
    }
  | {
      status: "ok";
      challengeId: string;
      prompt: string;
      displayText: string;
      attemptsLeft: number;
      expiresAt: number;
    };

type CaptchaVerifyResult =
  | { status: "ok" }
  | {
      status: "invalid";
      attemptsLeft: number;
    }
  | {
      status: "locked";
      lockedUntil: number;
    };

function getClientIp(request: FastifyRequest) {
  const forwardedFor = request.headers["x-forwarded-for"];
  const firstForwardedIp = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor?.split(",")[0]?.trim();

  return firstForwardedIp || request.ip || "unknown";
}

export function getCaptchaClientKey(request: FastifyRequest) {
  const ip = getClientIp(request);
  const userAgent = request.headers["user-agent"]?.slice(0, 80) ?? "unknown";

  return `${ip}|${userAgent}`;
}

function createCaptchaCode() {
  let code = "";

  for (let index = 0; index < CAPTCHA_CODE_LENGTH; index += 1) {
    const randomIndex = randomInt(0, CAPTCHA_ALPHABET.length);
    code += CAPTCHA_ALPHABET[randomIndex];
  }

  return code;
}

function randomTextChallenge() {
  const code = createCaptchaCode();

  return {
    prompt: "Digite o codigo de verificacao exibido.",
    displayText: code.split("").join(" "),
    answer: code
  };
}

function getState(clientKey: string): CaptchaClientState {
  const existing = captchaState.get(clientKey);

  if (existing) {
    return existing;
  }

  const created: CaptchaClientState = {
    failedAttempts: 0,
    lockedUntil: 0
  };

  captchaState.set(clientKey, created);
  return created;
}

function isLocked(state: CaptchaClientState, now: number) {
  return state.lockedUntil > now;
}

export function issueCaptchaForClient(clientKey: string): CaptchaIssueResult {
  const now = Date.now();
  const state = getState(clientKey);

  if (isLocked(state, now)) {
    return {
      status: "locked",
      lockedUntil: state.lockedUntil
    };
  }

  const challengeDefinition = randomTextChallenge();
  const challenge: CaptchaChallengeState = {
    id: randomUUID(),
    prompt: challengeDefinition.prompt,
    displayText: challengeDefinition.displayText,
    answer: challengeDefinition.answer,
    expiresAt: now + CAPTCHA_TTL_MS
  };

  state.challenge = challenge;

  return {
    status: "ok",
    challengeId: challenge.id,
    prompt: challenge.prompt,
    displayText: challenge.displayText,
    attemptsLeft: CAPTCHA_MAX_ATTEMPTS - state.failedAttempts,
    expiresAt: challenge.expiresAt
  };
}

function invalidateChallenge(state: CaptchaClientState) {
  delete state.challenge;
}

function registerFailure(state: CaptchaClientState, now: number): CaptchaVerifyResult {
  state.failedAttempts += 1;
  invalidateChallenge(state);

  if (state.failedAttempts >= CAPTCHA_MAX_ATTEMPTS) {
    state.lockedUntil = now + CAPTCHA_LOCK_MS;
    state.failedAttempts = 0;

    return {
      status: "locked",
      lockedUntil: state.lockedUntil
    };
  }

  return {
    status: "invalid",
    attemptsLeft: CAPTCHA_MAX_ATTEMPTS - state.failedAttempts
  };
}

export function verifyCaptchaForClient(
  clientKey: string,
  challengeId: string,
  answerInput: string
): CaptchaVerifyResult {
  const now = Date.now();
  const state = getState(clientKey);

  if (isLocked(state, now)) {
    return {
      status: "locked",
      lockedUntil: state.lockedUntil
    };
  }

  const challenge = state.challenge;

  if (!challenge || challenge.expiresAt < now || challenge.id !== challengeId) {
    return registerFailure(state, now);
  }

  const normalizedAnswer = answerInput.replace(/\s+/g, "").trim().toUpperCase();

  if (normalizedAnswer !== challenge.answer) {
    return registerFailure(state, now);
  }

  invalidateChallenge(state);
  state.failedAttempts = 0;
  state.lockedUntil = 0;

  return { status: "ok" };
}
