import Link from "next/link";

export default function HomePage() {
  return (
    <main className="hero">
      <div className="hero__backdrop" />
      <section className="hero__content">
        <p className="tag">Cpay SaaS</p>
        <h1>Checkout padrao pronto para lancar seu SaaS.</h1>
        <p>
          Base inicial com login e cadastro, motor de checkout padrao e arquitetura preparada para
          integrar gateways na fase 2.
        </p>
        <div className="hero__actions">
          <Link href="/register" className="btn btn--primary">
            Criar conta
          </Link>
          <Link href="/login" className="btn btn--ghost">
            Entrar
          </Link>
        </div>
      </section>
    </main>
  );
}
