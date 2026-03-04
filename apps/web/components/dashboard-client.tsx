"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

interface ProfileItem {
  id: string;
  email: string;
  username: string;
}

export function DashboardClient() {
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileItem | null>(null);
  const [checkouts, setCheckouts] = useState<CheckoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [profileResponse, checkoutResponse] = await Promise.all([
      fetch(`${getApiBaseUrl()}/v1/auth/me`, {
        credentials: "include"
      }),
      fetch(`${getApiBaseUrl()}/v1/checkouts`, {
        credentials: "include"
      })
    ]);

    if (profileResponse.status === 401 || checkoutResponse.status === 401) {
      setLoading(false);
      router.replace("/login");
      return;
    }

    if (!profileResponse.ok || !checkoutResponse.ok) {
      setError("Falha ao carregar dados do dashboard.");
      setLoading(false);
      return;
    }

    const profilePayload = (await profileResponse.json()) as { user?: ProfileItem };
    const checkoutPayload = (await checkoutResponse.json()) as { items?: CheckoutItem[] };

    setProfile(profilePayload.user ?? null);
    setCheckouts(checkoutPayload.items ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadDashboard().catch(() => {
      setError("Erro inesperado ao carregar dashboard.");
      setLoading(false);
    });
  }, [loadDashboard]);

  async function signOut() {
    try {
      await fetch(`${getApiBaseUrl()}/v1/auth/logout`, {
        method: "POST",
        credentials: "include"
      });
    } finally {
      router.replace("/login");
    }
  }

  if (loading) {
    return (
      <section className="screen dashboard-screen">
        <div className="dashboard-shell">
          <article className="panel">
            <h1>Carregando dashboard...</h1>
          </article>
        </div>
      </section>
    );
  }

  return (
    <section className="screen dashboard-screen">
      <div className="dashboard-shell">
        <header className="topbar panel">
          <div>
            <p className="brand-pill">CLPZ CHECKOUT</p>
            <h1>Painel</h1>
            <p className="subtle">
              {profile?.username ? `@${profile.username}` : profile?.email ?? "Sem usuario"}
            </p>
          </div>

          <button className="btn btn-ghost" onClick={signOut}>
            Sair
          </button>
        </header>

        {error ? (
          <article className="panel">
            <p className="error">{error}</p>
          </article>
        ) : null}

        <main className="dashboard-grid">
          <article className="panel">
            <CreateCheckoutForm onCreated={loadDashboard} />
          </article>

          <article className="panel">
            <div className="list-header">
              <h2>Checkouts criados</h2>
              <span>{checkouts.length}</span>
            </div>

            <ul className="checkout-list">
              {checkouts.map((checkout) => (
                <li key={checkout.id} className="checkout-item">
                  <strong>{checkout.name}</strong>
                  <p>URL: /checkout/{checkout.slug}</p>
                  <p>Gateway: {checkout.gateway_provider === "none" ? "sem gateway (MVP)" : checkout.gateway_provider}</p>
                  <p>Moeda: {checkout.currency}</p>
                </li>
              ))}
            </ul>

            {checkouts.length === 0 ? (
              <p className="subtle" style={{ marginTop: "1rem" }}>
                Nenhum checkout criado. Crie o primeiro no painel ao lado.
              </p>
            ) : null}
          </article>
        </main>
      </div>
    </section>
  );
}
