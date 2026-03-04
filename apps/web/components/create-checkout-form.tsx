"use client";

import { useState } from "react";
import type { GatewayProvider } from "@cpay/contracts";
import { getApiBaseUrl } from "@/lib/api-base-url";

interface CreateCheckoutFormProps {
  onCreated: () => Promise<void>;
}

export function CreateCheckoutForm({ onCreated }: CreateCheckoutFormProps) {
  const [name, setName] = useState("Checkout Principal");
  const [slug, setSlug] = useState("checkout-principal");
  const [gatewayProvider] = useState<GatewayProvider>("none");
  const [primaryColor, setPrimaryColor] = useState("#0ea5e9");
  const [accentColor, setAccentColor] = useState("#0f172a");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function createCheckout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${getApiBaseUrl()}/v1/checkouts`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          slug,
          currency: "BRL",
          gatewayProvider,
          theme: {
            primaryColor,
            accentColor,
            buttonStyle: "rounded"
          }
        })
      });

      if (response.status === 401) {
        throw new Error("Sessao expirada. Faca login novamente.");
      }

      if (!response.ok) {
        const body = await response.json().catch(() => ({ message: "Erro desconhecido" }));
        throw new Error(body.message ?? "Nao foi possivel criar checkout");
      }

      await onCreated();
      setSlug(`${slug}-${Math.floor(Math.random() * 1000)}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Erro ao criar checkout");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={createCheckout} className="checkout-form">
      <h2>Novo checkout</h2>
      <p className="subtle">Template padrao com variacao de cor e identidade.</p>

      <label className="field">
        Nome
        <input className="input" value={name} onChange={(event) => setName(event.target.value)} required />
      </label>

      <label className="field">
        Slug
        <input
          className="input"
          value={slug}
          onChange={(event) =>
            setSlug(
              event.target.value
                .toLowerCase()
                .replace(/[^a-z0-9-]/g, "-")
                .replace(/-{2,}/g, "-")
            )
          }
          required
        />
      </label>

      <label className="field">
        Pagamento
        <input className="input" value="Sem gateway (fase 1 do MVP)" disabled />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem", marginTop: "1rem" }}>
        <label className="field" style={{ marginTop: 0 }}>
          Cor principal
          <input className="input" type="color" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} />
        </label>

        <label className="field" style={{ marginTop: 0 }}>
          Cor de destaque
          <input className="input" type="color" value={accentColor} onChange={(event) => setAccentColor(event.target.value)} />
        </label>
      </div>

      <button className="btn btn-primary" disabled={loading} style={{ marginTop: "1rem", width: "100%" }}>
        {loading ? "Criando..." : "Criar checkout"}
      </button>

      {error ? <p className="error">{error}</p> : null}
    </form>
  );
}
