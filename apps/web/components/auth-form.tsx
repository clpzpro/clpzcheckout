"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type Mode = "login" | "register";

interface AuthFormProps {
  mode: Mode;
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isLogin = mode === "login";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setError("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para continuar.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const action = isLogin
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/dashboard` } });

    const { error: authError } = await action;

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (isLogin) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setSuccess("Conta criada. Se o provedor exigir validacao, confirme no email.");
    }

    setLoading(false);
  }

  return (
    <section className="auth-layout">
      <form className="auth-card" onSubmit={onSubmit}>
        <p className="tag">Cpay</p>
        <h1>{isLogin ? "Entrar" : "Criar conta"}</h1>

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

        <label className="field">
          Senha
          <input
            className="input"
            type="password"
            placeholder="********"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        <button className="btn btn--primary" disabled={loading} style={{ marginTop: "1rem", width: "100%" }}>
          {loading ? "Aguarde..." : isLogin ? "Entrar" : "Criar conta"}
        </button>

        {!supabase ? (
          <p className="error">Defina as variaveis do Supabase no arquivo `.env.local`.</p>
        ) : null}
        {error ? <p className="error">{error}</p> : null}
        {success ? <p className="success">{success}</p> : null}

        <p style={{ marginTop: "1rem" }}>
          {isLogin ? "Nao tem conta?" : "Ja possui conta?"} {" "}
          <Link href={isLogin ? "/register" : "/login"} style={{ color: "#6fffbf" }}>
            {isLogin ? "Cadastre-se" : "Entrar"}
          </Link>
        </p>
      </form>
    </section>
  );
}
