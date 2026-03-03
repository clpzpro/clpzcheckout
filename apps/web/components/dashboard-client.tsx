"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { getApiBaseUrl } from "@/lib/api-base-url";
import { CreateCheckoutForm } from "./create-checkout-form";

interface CheckoutItem {
  id: string;
  name: string;
  slug: string;
  currency: string;
  gateway_provider: string;
  created_at: string;
}

export function DashboardClient() {
  const supabase = getSupabaseBrowserClient();
  const [token, setToken] = useState<string | null>(null);
  const [checkouts, setCheckouts] = useState<CheckoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCheckouts = useCallback(async () => {
    if (!supabase) {
      setError("Configure o Supabase no .env.local para acessar o dashboard.");
      setLoading(false);
      return;
    }

    setError(null);

    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;

    if (!accessToken) {
      setToken(null);
      setCheckouts([]);
      setLoading(false);
      return;
    }

    setToken(accessToken);

    const response = await fetch(`${getApiBaseUrl()}/v1/checkouts`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      setError("Falha ao carregar checkouts");
      setLoading(false);
      return;
    }

    const payload = await response.json();
    setCheckouts(payload.items ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadCheckouts().catch(() => {
      setError("Erro ao carregar dashboard");
      setLoading(false);
    });
  }, [loadCheckouts]);

  async function signOut() {
    if (!supabase) {
      window.location.href = "/login";
      return;
    }

    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (loading) {
    return (
      <section className="auth-layout">
        <article className="dashboard-card">
          <h1>Carregando dashboard...</h1>
        </article>
      </section>
    );
  }

  if (!token) {
    return (
      <section className="auth-layout">
        <article className="dashboard-card">
          <h1>Sessao invalida</h1>
          <p>Faca login novamente para gerenciar seus checkouts.</p>
          <div style={{ marginTop: "1rem" }}>
            <Link href="/login" className="btn btn--primary">
              Ir para login
            </Link>
          </div>
        </article>
      </section>
    );
  }

  return (
    <section className="auth-layout">
      <article className="dashboard-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
          <div>
            <p className="tag">Painel Cpay</p>
            <h1>Seus checkouts</h1>
          </div>

          <button className="btn btn--ghost" onClick={signOut}>
            Sair
          </button>
        </div>

        <div className="dashboard-grid" style={{ marginTop: "1rem" }}>
          <CreateCheckoutForm accessToken={token} onCreated={loadCheckouts} />

          <section>
            <h2>Lista</h2>
            {error ? <p className="error">{error}</p> : null}
            <ul className="checkout-list">
              {checkouts.map((checkout) => (
                <li key={checkout.id} className="checkout-item">
                  <strong>{checkout.name}</strong>
                  <p>/{checkout.slug}</p>
                  <p>{checkout.gateway_provider === "none" ? "SEM GATEWAY" : checkout.gateway_provider.toUpperCase()} - {checkout.currency}</p>
                </li>
              ))}
              {checkouts.length === 0 ? <p>Nenhum checkout criado ainda.</p> : null}
            </ul>
          </section>
        </div>
      </article>
    </section>
  );
}
