"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { getApiBaseUrl } from "@/lib/api-base-url";

type Mode = "login" | "register";

interface AuthFormProps {
  mode: Mode;
}

interface CaptchaChallengePayload {
  challengeId: string;
  prompt: string;
  displayText?: string;
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

function formatClock(ms: number) {
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
  const [humanConfirmed, setHumanConfirmed] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [now, setNow] = useState(Date.now());
  const [heroPointer, setHeroPointer] = useState({ x: 0.5, y: 0.5 });

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

  const captchaExpiresInMs = useMemo(() => {
    if (!captcha?.expiresAt) {
      return 0;
    }

    return Math.max(0, captcha.expiresAt - now);
  }, [captcha, now]);

  const isCaptchaLocked = lockRemainingMs > 0;

  const visualStyle = useMemo(
    () =>
      ({
        "--pointer-x": heroPointer.x.toFixed(4),
        "--pointer-y": heroPointer.y.toFixed(4)
      }) as CSSProperties,
    [heroPointer]
  );

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
        | (CaptchaChallengePayload & { code?: string; lockedUntil?: number | string })
        | null;

      if (response.status === 429) {
        setCaptcha(null);
        setCaptchaLockedUntil(parseLockedUntil(payload?.lockedUntil));
        setHumanConfirmed(false);
        return;
      }

      if (!response.ok || !payload) {
        throw new Error("Nao foi possivel carregar o captcha.");
      }

      setCaptcha(payload);
      setCaptchaAnswer("");
      setCaptchaLockedUntil(null);
      setHumanConfirmed(false);
      setError(null);
    } catch {
      setCaptcha(null);
      setError("Nao foi possivel carregar a verificacao de seguranca. Atualize a pagina.");
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
    if (isLogin || !captchaLockedUntil) {
      return;
    }

    if (lockRemainingMs === 0) {
      setCaptchaLockedUntil(null);
      void fetchCaptchaChallenge();
    }
  }, [captchaLockedUntil, fetchCaptchaChallenge, isLogin, lockRemainingMs]);

  useEffect(() => {
    if (isLogin || !captcha || captchaLoading || isCaptchaLocked) {
      return;
    }

    if (captchaExpiresInMs === 0) {
      void fetchCaptchaChallenge();
    }
  }, [captcha, captchaExpiresInMs, captchaLoading, fetchCaptchaChallenge, isCaptchaLocked, isLogin]);

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
          `Verificacao bloqueada temporariamente. Aguarde ${formatClock(lockRemainingMs)}.`
        );
      }

      if (!humanConfirmed) {
        throw new Error("Confirme a verificacao de seguranca para continuar.");
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
        throw new Error("Verificacao nao carregada. Atualize o captcha e tente novamente.");
      }

      if (!captchaAnswer.trim()) {
        throw new Error("Digite o codigo de verificacao.");
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
        setHumanConfirmed(false);
        throw new Error("Verificacao bloqueada por 5 minutos apos 3 erros consecutivos.");
      }

      if (response.status === 400 && payload?.code === "CAPTCHA_INVALID") {
        await fetchCaptchaChallenge();
        throw new Error(
          `Codigo invalido. Tentativas restantes: ${Math.max(0, payload.attemptsLeft ?? 0)}.`
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
            Entrar
          </Link>
          <Link
            href="/register"
            className={`auth-nav-button auth-nav-primary ${!isLogin ? "active" : ""}`}
          >
            Criar conta
          </Link>
        </nav>
      </header>

      <div className="auth-layout">
        <aside
          className="auth-visual"
          aria-hidden="true"
          style={visualStyle}
          onPointerMove={(event) => {
            const target = event.currentTarget;
            const rect = target.getBoundingClientRect();
            const nextX = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
            const nextY = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
            setHeroPointer({ x: nextX, y: nextY });
          }}
          onPointerLeave={() => {
            setHeroPointer({ x: 0.5, y: 0.5 });
          }}
        >
          <div className="auth-visual-gradient" />
          <div className="auth-visual-glow" />
          <div className="hero-orb-shell">
            <div className="brand-bubble brand-bubble-hero" />
          </div>
        </aside>

        <form className="auth-panel" onSubmit={onSubmit}>
          <h1>{isLogin ? "Entrar" : "Criar conta"}</h1>
          <p className="auth-subtitle">
            {isLogin
              ? "Acesse seu painel com email ou username."
              : "Cadastre username, email e senha para abrir seu dashboard."}
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
            <section className="captcha-card" aria-live="polite">
              <div className="captcha-headline">
                <span className="captcha-tag">Verificacao de seguranca</span>
                <button
                  type="button"
                  className="captcha-refresh"
                  onClick={() => {
                    void fetchCaptchaChallenge();
                  }}
                  disabled={captchaLoading || loading || isCaptchaLocked}
                >
                  Novo codigo
                </button>
              </div>

              <label className="captcha-checkline">
                <input
                  type="checkbox"
                  className="captcha-toggle"
                  checked={humanConfirmed}
                  onChange={(event) => setHumanConfirmed(event.target.checked)}
                  disabled={isCaptchaLocked || captchaLoading || !captcha}
                />
                <span>Confirmo que sou uma pessoa real</span>
              </label>

              <div className={`captcha-display ${humanConfirmed && captcha ? "ready" : ""}`}>
                <span>
                  {isCaptchaLocked
                    ? "BLOQUEADO"
                    : humanConfirmed && captcha
                      ? captcha.displayText ?? captcha.prompt
                      : "••••••"}
                </span>
              </div>

              <label className="field captcha-field">
                Codigo
                <input
                  className="input"
                  type="text"
                  placeholder="Digite o codigo mostrado"
                  value={captchaAnswer}
                  onChange={(event) => setCaptchaAnswer(event.target.value.toUpperCase())}
                  required
                  disabled={captchaLoading || isCaptchaLocked || loading || !captcha || !humanConfirmed}
                />
              </label>

              <div className="captcha-meta-grid subtle">
                <p>
                  {isCaptchaLocked
                    ? `Novo desafio em ${formatClock(lockRemainingMs)}`
                    : `Tentativas restantes: ${Math.max(0, captcha?.attemptsLeft ?? 0)}`}
                </p>
                <p>
                  {isCaptchaLocked
                    ? "Bloqueio ativo por seguranca"
                    : `Expira em ${formatClock(captchaExpiresInMs)}`}
                </p>
              </div>
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
