"use client";

import { useState } from "react";
import type { GatewayProvider } from "@cpay/contracts";
import { getApiBaseUrl } from "@/lib/api-base-url";

interface CreateCheckoutFormProps {
  accessToken: string;
  onCreated: () => Promise<void>;
}

export function CreateCheckoutForm({ accessToken, onCreated }: CreateCheckoutFormProps) {
  const [name, setName] = useState("Checkout Principal");
  const [slug, setSlug] = useState("checkout-principal");
  const [gatewayProvider] = useState<GatewayProvider>("none");
  const [primaryColor, setPrimaryColor] = useState("#2FD4A8");
  const [accentColor, setAccentColor] = useState("#0A1628");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function createCheckout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${getApiBaseUrl()}/v1/checkouts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
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
    <form onSubmit={createCheckout}>
      <h2>Novo checkout</h2>

      <label className="field">
        Nome
        <input className="input" value={name} onChange={(event) => setName(event.target.value)} required />
      </label>

      <label className="field">
        Slug
        <input className="input" value={slug} onChange={(event) => setSlug(event.target.value)} required />
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

      <button className="btn btn--primary" disabled={loading} style={{ marginTop: "1rem", width: "100%" }}>
        {loading ? "Criando..." : "Criar checkout"}
      </button>

      {error ? <p className="error">{error}</p> : null}
    </form>
  );
}
