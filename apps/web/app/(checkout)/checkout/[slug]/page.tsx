interface CheckoutPageProps {
  params: Promise<{ slug: string }>;
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { slug } = await params;

  return (
    <main className="auth-layout">
      <section className="checkout-card">
        <p className="tag">Cpay Checkout</p>
        <h1>/{slug}</h1>
        <p>
          Esse e o template padrao do checkout. As variacoes ficam concentradas em cores, logo,
          textos e campos opcionais, mantendo consistencia visual e alta conversao.
          Nesta fase o pagamento real ainda nao esta habilitado.
        </p>

        <form style={{ marginTop: "1rem", display: "grid", gap: "0.8rem" }}>
          <label className="field" style={{ marginTop: 0 }}>
            Nome completo
            <input className="input" placeholder="Maria Oliveira" />
          </label>

          <label className="field" style={{ marginTop: 0 }}>
            Email
            <input className="input" placeholder="maria@email.com" />
          </label>

          <label className="field" style={{ marginTop: 0 }}>
            Cartao
            <input className="input" placeholder="0000 0000 0000 0000" />
          </label>

          <button className="btn btn--primary" type="button">
            Pagamento em breve
          </button>
        </form>
      </section>
    </main>
  );
}
