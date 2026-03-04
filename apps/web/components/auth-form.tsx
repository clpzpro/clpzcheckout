"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getApiBaseUrl } from "@/lib/api-base-url";

type Mode = "login" | "register";

interface AuthFormProps {
  mode: Mode;
}

const USERNAME_REGEX = /^[a-z0-9_]{3,24}$/;

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isLogin = mode === "login";

  useEffect(() => {
    fetch(`${getApiBaseUrl()}/v1/auth/me`, { credentials: "include" })
      .then((response) => {
        if (response.ok) {
          router.replace("/dashboard");
        }
      })
      .catch(() => {
        // sem sessao valida
      });
  }, [router]);

  async function checkAvailability(nextEmail: string, nextUsername: string) {
    const response = await fetch(`${getApiBaseUrl()}/v1/auth/check-availability`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: nextEmail.trim().toLowerCase(),
        username: nextUsername.trim().toLowerCase()
      })
    });

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
        const response = await fetch(`${getApiBaseUrl()}/v1/auth/login`, {
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
          throw new Error("Credenciais invalidas.");
        }

        router.push("/dashboard");
        router.refresh();
        return;
      }

      const normalizedUsername = username.trim().toLowerCase();
      const normalizedEmail = email.trim().toLowerCase();

      if (!USERNAME_REGEX.test(normalizedUsername)) {
        throw new Error("Username invalido. Use 3 a 24 caracteres com a-z, 0-9 e _.");
      }

      if (password !== confirmPassword) {
        throw new Error("As senhas nao coincidem.");
      }

      await checkAvailability(normalizedEmail, normalizedUsername);

      const response = await fetch(`${getApiBaseUrl()}/v1/auth/register`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: normalizedEmail,
          username: normalizedUsername,
          password
        })
      });

      if (response.status === 409) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? "Email ou username ja esta em uso.");
      }

      if (!response.ok) {
        throw new Error("Nao foi possivel criar a conta.");
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
      <form className="auth-card" onSubmit={onSubmit}>
        <p className="brand-pill">CLPZ CHECKOUT</p>
        <h1>{isLogin ? "Entrar" : "Criar conta"}</h1>
        <p className="subtle auth-subtitle">
          {isLogin
            ? "Acesse o painel com seu email ou username."
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
          <input
            className="input"
            type="password"
            placeholder="********"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
          />
        </label>

        {!isLogin ? (
          <label className="field">
            Confirmar senha
            <input
              className="input"
              type="password"
              placeholder="********"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              required
            />
          </label>
        ) : null}

        <button className="btn btn-primary" disabled={loading}>
          {loading ? "Processando..." : isLogin ? "Entrar" : "Criar conta"}
        </button>

        {error ? <p className="error">{error}</p> : null}
        {success ? <p className="success">{success}</p> : null}

        <p className="switch-auth">
          {isLogin ? "Ainda nao tem conta?" : "Ja possui conta?"}{" "}
          <Link href={isLogin ? "/register" : "/login"}>
            {isLogin ? "Criar conta" : "Entrar"}
          </Link>
        </p>
      </form>
    </section>
  );
}
