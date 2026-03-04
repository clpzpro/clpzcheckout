"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "@/lib/api-base-url";

type Mode = "login" | "register";

interface AuthFormProps {
  mode: Mode;
}

interface CaptchaChallengePayload {
  challengeId: string;
  prompt: string;
  attemptsLeft: number;
  expiresAt: number;
}

const USERNAME_REGEX = /^[a-z0-9_]{3,24}$/;
const CAPTCHA_LOCK_FALLBACK_MS = 5 * 60 * 1000;

function parseLockedUntil(raw: unknown) {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }

  if (typeof raw === "string") {
    const asNumber = Number(raw);

    if (Number.isFinite(asNumber)) {
      return asNumber;
    }

    const asDate = Date.parse(raw);
    if (!Number.isNaN(asDate)) {
      return asDate;
    }
  }

  return Date.now() + CAPTCHA_LOCK_FALLBACK_MS;
}

function formatLockRemaining(ms: number) {
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.ceil(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");

  return `${minutes}:${seconds}`;
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const isLogin = mode === "login";

  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [captcha, setCaptcha] = useState<CaptchaChallengePayload | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [captchaLockedUntil, setCaptchaLockedUntil] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [now, setNow] = useState(Date.now());

  const apiBaseUrl = getApiBaseUrl();

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const lockRemainingMs = useMemo(() => {
    if (!captchaLockedUntil) {
      return 0;
    }

    return Math.max(0, captchaLockedUntil - now);
  }, [captchaLockedUntil, now]);

  const isCaptchaLocked = lockRemainingMs > 0;

  const fetchCaptchaChallenge = useCallback(async () => {
    if (isLogin) {
      return;
    }

    setCaptchaLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/v1/auth/captcha/challenge`, {
        credentials: "include"
      });

      const payload = (await response.json().catch(() => null)) as
        | (CaptchaChallengePayload & { code?: string; lockedUntil?: number | string; message?: string })
        | null;

      if (response.status === 429) {
        setCaptcha(null);
        setCaptchaLockedUntil(parseLockedUntil(payload?.lockedUntil));
        return;
      }

      if (!response.ok || !payload) {
        throw new Error("Nao foi possivel carregar o captcha.");
      }

      setCaptcha(payload);
      setCaptchaAnswer("");
      setCaptchaLockedUntil(null);
      setError(null);
    } catch {
      setError("Nao foi possivel carregar o captcha. Atualize a pagina.");
    } finally {
      setCaptchaLoading(false);
    }
  }, [apiBaseUrl, isLogin]);

  useEffect(() => {
    fetch(`${apiBaseUrl}/v1/auth/me`, { credentials: "include" })
      .then((response) => {
        if (response.ok) {
          router.replace("/dashboard");
        }
      })
      .catch(() => {
        // sem sessao valida
      });
  }, [apiBaseUrl, router]);

  useEffect(() => {
    if (!isLogin) {
      void fetchCaptchaChallenge();
    }
  }, [fetchCaptchaChallenge, isLogin]);

  useEffect(() => {
    if (isLogin) {
      return;
    }

    if (!captchaLockedUntil) {
      return;
    }

    if (lockRemainingMs === 0) {
      setCaptchaLockedUntil(null);
      void fetchCaptchaChallenge();
    }
  }, [captchaLockedUntil, fetchCaptchaChallenge, isLogin, lockRemainingMs]);

  async function checkAvailability(nextEmail: string, nextUsername: string) {
    const response = await fetch(`${apiBaseUrl}/v1/auth/check-availability`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: nextEmail,
        username: nextUsername
      })
    });

    if (response.status === 404) {
      // fallback para ambientes ainda sem esta rota; o /register valida novamente
      return;
    }

    if (!response.ok) {
      throw new Error("Falha ao validar disponibilidade.");
    }

    const payload = (await response.json()) as {
      emailExists: boolean;
      usernameExists: boolean;
    };

    if (payload.emailExists) {
      throw new Error("Este email ja possui conta.");
    }

    if (payload.usernameExists) {
      throw new Error("Este username ja esta em uso.");
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isLogin) {
        const response = await fetch(`${apiBaseUrl}/v1/auth/login`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            identifier: identifier.trim().toLowerCase(),
            password
          })
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { message?: string } | null;
          throw new Error(payload?.message ?? "Credenciais invalidas.");
        }

        router.push("/dashboard");
        router.refresh();
        return;
      }

      if (isCaptchaLocked) {
        throw new Error(
          `Captcha bloqueado temporariamente. Aguarde ${formatLockRemaining(lockRemainingMs)}.`
        );
      }

      const normalizedEmail = email.trim().toLowerCase();
      const normalizedUsername = username.trim().toLowerCase();

      if (!USERNAME_REGEX.test(normalizedUsername)) {
        throw new Error("Username invalido. Use 3 a 24 caracteres (a-z, 0-9 e _).");
      }

      if (password.length < 8) {
        throw new Error("Senha deve ter pelo menos 8 caracteres.");
      }

      if (!captcha?.challengeId) {
        throw new Error("Captcha nao carregado. Atualize o captcha e tente novamente.");
      }

      await checkAvailability(normalizedEmail, normalizedUsername);

      const response = await fetch(`${apiBaseUrl}/v1/auth/register`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: normalizedEmail,
          username: normalizedUsername,
          password,
          captchaId: captcha.challengeId,
          captchaAnswer: captchaAnswer.trim()
        })
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            message?: string;
            code?: string;
            attemptsLeft?: number;
            lockedUntil?: number | string;
          }
        | null;

      if (response.status === 429 && payload?.code === "CAPTCHA_LOCKED") {
        setCaptchaLockedUntil(parseLockedUntil(payload.lockedUntil));
        setCaptcha(null);
        throw new Error("Captcha bloqueado por 5 minutos apos 3 tentativas invalidas.");
      }

      if (response.status === 400 && payload?.code === "CAPTCHA_INVALID") {
        await fetchCaptchaChallenge();
        throw new Error(
          `Captcha invalido. Tentativas restantes: ${Math.max(0, payload.attemptsLeft ?? 0)}.`
        );
      }

      if (response.status === 409) {
        throw new Error(payload?.message ?? "Email ou username ja esta em uso.");
      }

      if (!response.ok) {
        throw new Error(payload?.message ?? "Nao foi possivel criar a conta.");
      }

      setSuccess("Conta criada com sucesso.");
      router.push("/dashboard");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="screen auth-screen">
      <header className="auth-topbar">
        <Link href="/login" className="brand-bubble brand-bubble-small" aria-label="clpzcheckout" />

        <nav className="auth-nav-actions" aria-label="Navegacao de autenticacao">
          <Link href="/login" className={`auth-nav-button ${isLogin ? "active" : ""}`}>
            Log in
          </Link>
          <Link href="/register" className={`auth-nav-button auth-nav-primary ${!isLogin ? "active" : ""}`}>
            Sign up
          </Link>
        </nav>
      </header>

      <div className="auth-layout">
        <aside className="auth-visual" aria-hidden="true">
          <div className="auth-visual-gradient" />
          <div className="brand-bubble brand-bubble-hero" />
        </aside>

        <form className="auth-panel" onSubmit={onSubmit}>
          <h1>{isLogin ? "Log in" : "Sign up"}</h1>
          <p className="auth-subtitle">
            {isLogin
              ? "Acesse seu painel com email ou username."
              : "Crie sua conta com username, email e senha para entrar no dashboard."}
          </p>

          {isLogin ? (
            <label className="field">
              Email ou username
              <input
                className="input"
                type="text"
                placeholder="voce@empresa.com ou seu_username"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                required
              />
            </label>
          ) : (
            <>
              <label className="field">
                Username
                <input
                  className="input"
                  type="text"
                  placeholder="seu_username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value.toLowerCase())}
                  minLength={3}
                  maxLength={24}
                  required
                />
              </label>

              <label className="field">
                Email
                <input
                  className="input"
                  type="email"
                  placeholder="voce@empresa.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
            </>
          )}

          <label className="field">
            Senha
            <div className="password-row">
              <input
                className="input"
                type={showPassword ? "text" : "password"}
                placeholder="********"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </label>

          {!isLogin ? (
            <section className="captcha-box" aria-live="polite">
              <div className="captcha-header">
                <span className="captcha-tag">Captcha local</span>
                <button
                  type="button"
                  className="captcha-refresh"
                  onClick={() => {
                    void fetchCaptchaChallenge();
                  }}
                  disabled={captchaLoading || loading || isCaptchaLocked}
                >
                  Atualizar
                </button>
              </div>

              <p className="captcha-prompt">
                {isCaptchaLocked
                  ? `Novo desafio disponivel em ${formatLockRemaining(lockRemainingMs)}.`
                  : captcha?.prompt ?? "Carregando desafio..."}
              </p>

              <label className="field captcha-field">
                Resposta
                <input
                  className="input"
                  type="text"
                  placeholder="Digite o resultado"
                  value={captchaAnswer}
                  onChange={(event) => setCaptchaAnswer(event.target.value)}
                  required
                  disabled={captchaLoading || isCaptchaLocked || loading || !captcha}
                />
              </label>

              <p className="subtle captcha-meta">
                {isCaptchaLocked
                  ? "3 erros seguidos detectados. Bloqueio temporario ativo."
                  : `Tentativas restantes: ${Math.max(0, captcha?.attemptsLeft ?? 0)}`}
              </p>
            </section>
          ) : null}

          <button
            className="btn btn-primary auth-submit"
            disabled={loading || (!isLogin && (captchaLoading || isCaptchaLocked))}
          >
            {loading ? "Processando..." : isLogin ? "Entrar" : "Criar conta"}
          </button>

          {error ? <p className="error">{error}</p> : null}
          {success ? <p className="success">{success}</p> : null}

          <p className="switch-auth">
            {isLogin ? "Ainda nao tem conta?" : "Ja possui conta?"}{" "}
            <Link href={isLogin ? "/register" : "/login"}>{isLogin ? "Criar conta" : "Entrar"}</Link>
          </p>
        </form>
      </div>
    </section>
  );
}
