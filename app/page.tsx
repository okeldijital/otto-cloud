import Image from "next/image";
import Link from "next/link";

const domains = [
  ["01", "Contracts", "Agreements, parties, terms and the documents that belong to them."],
  ["02", "Rights", "The rights and relationships that sit behind the catalogue."],
  ["03", "Releases", "Release records, tracks, artists and catalogue relationships."],
  ["04", "People", "Artists, contributors, contacts and the people connected to the work."],
  ["05", "Documents", "The documents that support the organisation and its records."],
  ["06", "Organisations", "Labels, publishers, management companies and other organisations."],
];

const reasons = [
  ["Clarity", "See the information connected to the work it belongs to."],
  ["Control", "Keep records, relationships and access under the organisation's control."],
  ["Continuity", "Keep the operating record together as work moves from contract to catalogue and back."],
];

const audiences = [
  ["Labels", "Catalogue, contracts, artists and release operations in one system."],
  ["Management companies", "Keep people, organisations, agreements and documents connected."],
  ["Publishers", "Maintain the records and relationships behind rights administration."],
  ["Music organisations", "A shared operating layer for teams whose work crosses domains."],
];

export default function Home() {
  return (
    <main className="landing">
      <nav className="landing-nav" aria-label="Primary navigation">
        <div className="landing-container nav-inner">
          <Link href="/" className="brand-link" aria-label="OTTO home">
            <Image src="/otto-logo.svg" alt="OTTO" width={213} height={80} priority />
          </Link>
          <div className="nav-links">
            <a href="#product">Product</a>
            <a href="#how-it-connects">How it connects</a>
            <a href="#who-its-for">Who it&apos;s for</a>
          </div>
          <div className="nav-actions">
            <Link href="/auth/login" className="nav-signin">Sign in</Link>
            <Link href="/auth/login" className="nav-cta">Open OTTO</Link>
          </div>
        </div>
      </nav>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-signal" aria-hidden="true">
          <span className="signal-line signal-line-a" />
          <span className="signal-line signal-line-b" />
          <span className="signal-line signal-line-c" />
          <span className="signal-node signal-node-a" />
          <span className="signal-node signal-node-b" />
          <span className="signal-node signal-node-c" />
          <span className="signal-node signal-node-d" />
        </div>
        <div className="landing-container hero-inner">
          <div className="hero-copy">
            <p className="eyebrow"><span /> Music operations infrastructure</p>
            <h1 id="hero-title">The operating system for the work behind music.</h1>
            <p className="hero-lede">
              OTTO keeps contracts, releases, people, rights and documents together — and connects them to the organisations and work they belong to.
            </p>
            <div className="hero-actions">
              <Link href="/auth/login" className="button button-primary">Open OTTO <span>→</span></Link>
              <a href="#product" className="button button-secondary">See the product <span>↓</span></a>
            </div>
          </div>
          <div className="hero-foot">
            <span>OTTO CLOUD</span>
            <span>RECORD LABEL OPERATING SYSTEM</span>
          </div>
        </div>
      </section>

      <section className="section section-intro" id="product">
        <div className="landing-container split-intro">
          <div>
            <p className="eyebrow">What OTTO is</p>
            <h2>One place for the operational work behind a music organisation.</h2>
          </div>
          <div className="intro-copy">
            <p>
              Music businesses run on relationships. A contract connects people to a release. A release connects artists, tracks and rights. Documents support all of it.
            </p>
            <p>
              OTTO gives those records a shared operating context, so the information stays connected instead of becoming a collection of isolated files and lists.
            </p>
          </div>
        </div>
        <div className="landing-container domain-grid">
          {domains.map(([number, title, description]) => (
            <article className="domain-card" key={title}>
              <span className="domain-number">{number}</span>
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section section-dark">
        <div className="landing-container">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Why it matters</p>
              <h2>Connected information is easier to operate.</h2>
            </div>
            <p>
              OTTO is built around the practical relationships that make music operations work. The result is less hunting across systems and more context where the work happens.
            </p>
          </div>
          <div className="reason-grid">
            {reasons.map(([title, text], index) => (
              <article className="reason-card" key={title}>
                <span>0{index + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-connect" id="how-it-connects">
        <div className="landing-container">
          <div className="section-heading narrow">
            <p className="eyebrow">How information connects</p>
            <h2>OTTO is not a set of separate records.</h2>
            <p>
              The value is in the relationships between them. A contract can be connected to the people, releases, rights and documents it relates to.
            </p>
          </div>

          <div className="relationship-map" aria-label="Example OTTO information relationships">
            <div className="relationship-line line-one" />
            <div className="relationship-line line-two" />
            <div className="relationship-line line-three" />
            <div className="relationship-line line-four" />
            <div className="relationship-node node-contract"><small>CONTRACT</small><strong>Agreement</strong></div>
            <div className="relationship-node node-people"><small>PEOPLE</small><strong>Artists &amp; contacts</strong></div>
            <div className="relationship-node node-release"><small>RELEASE</small><strong>Catalogue</strong></div>
            <div className="relationship-node node-rights"><small>RIGHTS</small><strong>Ownership</strong></div>
            <div className="relationship-node node-documents"><small>DOCUMENTS</small><strong>Source files</strong></div>
            <div className="relationship-center">OTTO</div>
          </div>
        </div>
      </section>

      <section className="section section-showcase">
        <div className="landing-container">
          <div className="showcase-heading">
            <div>
              <p className="eyebrow">Product</p>
              <h2>See the system, not a marketing mockup.</h2>
            </div>
            <p>
              The landing page uses the real OTTO interface as product evidence. The same operating surfaces are used by the teams doing the work.
            </p>
          </div>
          <div className="product-frame">
            <div className="product-frame-bar">
              <span className="frame-dot" />
              <span className="frame-dot" />
              <span className="frame-dot" />
              <span className="frame-path">OTTO / Dashboard</span>
            </div>
            <div className="product-image">
              <Image
                src="/assets/dashboard-preview.png"
                alt="OTTO dashboard showing the current product interface"
                fill
                sizes="(max-width: 900px) 100vw, 1200px"
                style={{ objectFit: "cover", objectPosition: "top center" }}
              />
            </div>
          </div>
          <div className="showcase-caption">
            <span>REAL OTTO INTERFACE</span>
            <span>Dashboard / current product surface</span>
          </div>
        </div>
      </section>

      <section className="section section-audience" id="who-its-for">
        <div className="landing-container">
          <div className="section-heading narrow">
            <p className="eyebrow">Who it&apos;s for</p>
            <h2>Built for music organisations.</h2>
            <p>
              OTTO is designed for organisations whose work spans catalogue, contracts, people, rights and documents.
            </p>
          </div>
          <div className="audience-grid">
            {audiences.map(([title, text]) => (
              <article className="audience-card" key={title}>
                <span className="audience-mark">+</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-access">
        <div className="landing-container access-layout">
          <div>
            <p className="eyebrow">Organisation &amp; access</p>
            <h2>Organisation-owned information. Controlled access.</h2>
          </div>
          <div className="access-copy">
            <p>
              OTTO works around organisations, their members and their roles. Information belongs in the organisation context where it is operated, with access governed by the organisation&apos;s permissions.
            </p>
            <div className="access-rule"><span /> Organisation</div>
            <div className="access-rule"><span /> Members &amp; roles</div>
            <div className="access-rule"><span /> Controlled records</div>
          </div>
        </div>
      </section>

      <section className="final-cta">
        <div className="landing-container final-cta-inner">
          <p className="eyebrow">OTTO CLOUD</p>
          <h2>See how your music organisation fits together.</h2>
          <p>Explore the product and its operating model.</p>
          <Link href="/auth/login" className="button button-primary">Open OTTO <span>→</span></Link>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-container footer-inner">
          <Image src="/otto-logo.svg" alt="OTTO" width={160} height={60} />
          <div className="footer-links">
            <a href="#product">Product</a>
            <a href="#how-it-connects">How it connects</a>
            <a href="#who-its-for">Who it&apos;s for</a>
            <Link href="/auth/login">Sign in</Link>
          </div>
          <span>© {new Date().getFullYear()} Okel Dijital</span>
        </div>
      </footer>

      <style jsx global>{`
        .landing {
          --landing-max: 1240px;
          min-height: 100vh;
          background: var(--color-background);
          color: var(--color-text-primary);
          overflow: hidden;
        }

        .landing-container {
          width: min(calc(100% - 48px), var(--landing-max));
          margin: 0 auto;
        }

        .landing-nav {
          position: absolute;
          z-index: 10;
          inset: 0 0 auto;
          height: 80px;
          border-bottom: 1px solid rgba(42, 42, 50, 0.7);
          background: rgba(10, 10, 12, 0.78);
          backdrop-filter: blur(16px);
        }

        .nav-inner {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 32px;
        }

        .brand-link { display: flex; align-items: center; width: 106px; }
        .brand-link img { width: 106px; height: auto; }
        .nav-links { display: flex; align-items: center; gap: 28px; margin-left: auto; }
        .nav-links a, .nav-signin { color: var(--color-text-secondary); font-size: 13px; text-decoration: none; transition: color var(--motion-fast) ease; }
        .nav-links a:hover, .nav-signin:hover { color: var(--color-text-primary); }
        .nav-actions { display: flex; align-items: center; gap: 18px; }
        .nav-cta {
          color: var(--color-background);
          background: var(--color-accent);
          border-radius: var(--radius-sm);
          padding: 9px 14px;
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
        }

        .hero {
          position: relative;
          min-height: 780px;
          display: flex;
          align-items: center;
          border-bottom: 1px solid var(--color-border);
          isolation: isolate;
        }

        .hero-grid {
          position: absolute;
          inset: 80px 0 0;
          opacity: 0.42;
          background-image:
            linear-gradient(rgba(42,42,50,.24) 1px, transparent 1px),
            linear-gradient(90deg, rgba(42,42,50,.24) 1px, transparent 1px);
          background-size: 72px 72px;
          mask-image: linear-gradient(to bottom, black, transparent 78%);
        }

        .hero-signal {
          position: absolute;
          width: min(52vw, 720px);
          height: min(52vw, 720px);
          right: 3vw;
          top: 120px;
          opacity: .9;
        }

        .signal-line {
          position: absolute;
          height: 1px;
          background: var(--color-accent);
          transform-origin: left center;
          opacity: .5;
        }

        .signal-line-a { width: 72%; left: 12%; top: 48%; transform: rotate(-23deg); }
        .signal-line-b { width: 55%; left: 22%; top: 61%; transform: rotate(31deg); opacity: .28; }
        .signal-line-c { width: 48%; left: 36%; top: 32%; transform: rotate(77deg); opacity: .22; }
        .signal-node {
          position: absolute;
          width: 9px;
          height: 9px;
          border: 1px solid var(--color-accent);
          background: var(--color-background);
          box-shadow: var(--shadow-glow);
          transform: rotate(45deg);
        }
        .signal-node-a { left: 16%; top: 44%; }
        .signal-node-b { left: 66%; top: 28%; }
        .signal-node-c { left: 78%; top: 65%; }
        .signal-node-d { left: 31%; top: 73%; }

        .hero-inner { position: relative; z-index: 2; padding-top: 80px; }
        .hero-copy { max-width: 780px; padding: 100px 0 120px; }
        .eyebrow {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
          color: var(--color-text-secondary);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .14em;
          text-transform: uppercase;
        }
        .eyebrow span { width: 7px; height: 7px; background: var(--color-accent); transform: rotate(45deg); }
        .hero h1 {
          max-width: 760px;
          margin: 0;
          font-size: clamp(52px, 7vw, 94px);
          line-height: .94;
          letter-spacing: -.055em;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .hero-lede {
          max-width: 650px;
          margin: 34px 0 0;
          color: var(--color-text-secondary);
          font-size: clamp(18px, 2vw, 22px);
          line-height: 1.5;
        }
        .hero-actions { display: flex; gap: 12px; margin-top: 36px; }
        .button {
          display: inline-flex;
          align-items: center;
          gap: 16px;
          min-height: 46px;
          padding: 0 17px;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
          transition: transform var(--motion-fast) ease, background-color var(--motion-fast) ease, border-color var(--motion-fast) ease;
        }
        .button:hover { transform: translateY(-1px); }
        .button-primary { color: var(--color-background); background: var(--color-accent); }
        .button-secondary { color: var(--color-text-primary); border: 1px solid var(--color-border); background: rgba(18,18,22,.65); }
        .button-secondary:hover { border-color: var(--border-strong); background: var(--color-surface); }
        .hero-foot {
          display: flex;
          justify-content: space-between;
          padding: 0 0 28px;
          color: #5d5d68;
          font-size: 9px;
          letter-spacing: .16em;
          font-weight: 700;
        }

        .section { padding: 140px 0; border-bottom: 1px solid var(--color-border); }
        .section-intro { background: var(--color-background); }
        .split-intro { display: grid; grid-template-columns: 1.1fr .9fr; gap: 100px; align-items: end; }
        .split-intro h2, .section h2, .final-cta h2 {
          margin: 0;
          color: var(--color-text-primary);
          font-size: clamp(38px, 5vw, 64px);
          line-height: 1.02;
          letter-spacing: -.04em;
          font-weight: 600;
        }
        .intro-copy { color: var(--color-text-secondary); font-size: 18px; line-height: 1.65; max-width: 560px; }
        .intro-copy p + p { margin-top: 20px; }

        .domain-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; margin-top: 90px; border: 1px solid var(--color-border); background: var(--color-border); }
        .domain-card { min-height: 190px; display: flex; flex-direction: column; justify-content: space-between; gap: 34px; padding: 24px; background: var(--color-background); }
        .domain-card:hover { background: var(--color-surface); }
        .domain-number { color: var(--color-accent); font: 700 10px/1 Inter, sans-serif; letter-spacing: .14em; }
        .domain-card h3, .reason-card h3, .audience-card h3 { margin: 0 0 10px; font-size: 21px; font-weight: 600; letter-spacing: -.02em; }
        .domain-card p, .reason-card p, .audience-card p { margin: 0; color: var(--color-text-secondary); font-size: 14px; line-height: 1.55; }

        .section-dark { background: var(--color-surface); }
        .section-heading { display: grid; grid-template-columns: 1.15fr .85fr; gap: 90px; align-items: end; }
        .section-heading > p { margin: 0; color: var(--color-text-secondary); font-size: 16px; line-height: 1.65; }
        .reason-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; margin-top: 72px; background: var(--color-border); border: 1px solid var(--color-border); }
        .reason-card { min-height: 270px; padding: 28px; background: var(--color-surface); }
        .reason-card > span { display: block; margin-bottom: 78px; color: var(--color-accent); font-size: 10px; letter-spacing: .12em; }

        .section-connect { background: var(--color-background); }
        .section-heading.narrow { display: block; max-width: 760px; }
        .section-heading.narrow h2 { max-width: 720px; }
        .section-heading.narrow > p:last-child { max-width: 650px; margin-top: 24px; }
        .relationship-map { position: relative; height: 540px; margin-top: 72px; border: 1px solid var(--color-border); overflow: hidden; background: radial-gradient(circle at 50% 50%, rgba(0,229,255,.055), transparent 30%), var(--color-surface); }
        .relationship-map:before, .relationship-map:after { content: ""; position: absolute; background: var(--color-border); }
        .relationship-map:before { width: 1px; height: 100%; left: 50%; top: 0; }
        .relationship-map:after { height: 1px; width: 100%; top: 50%; left: 0; }
        .relationship-line { position: absolute; height: 1px; background: rgba(0,229,255,.38); transform-origin: left center; }
        .line-one { width: 31%; left: 50%; top: 50%; transform: rotate(-27deg); }
        .line-two { width: 31%; left: 50%; top: 50%; transform: rotate(27deg); }
        .line-three { width: 31%; left: 50%; top: 50%; transform: rotate(153deg); }
        .line-four { width: 31%; left: 50%; top: 50%; transform: rotate(207deg); }
        .relationship-node { position: absolute; width: 180px; padding: 17px; border: 1px solid var(--color-border); background: rgba(18,18,22,.96); box-shadow: var(--shadow-md); }
        .relationship-node small { display: block; margin-bottom: 8px; color: var(--color-accent); font-size: 9px; font-weight: 700; letter-spacing: .12em; }
        .relationship-node strong { font-size: 13px; font-weight: 500; }
        .node-contract { left: 8%; top: 12%; }
        .node-people { right: 8%; top: 12%; }
        .node-release { right: 8%; bottom: 12%; }
        .node-rights { left: 8%; bottom: 12%; }
        .node-documents { left: calc(50% - 90px); top: 5%; transform: translateY(-100%); opacity: 0; }
        .relationship-center { position: absolute; left: 50%; top: 50%; width: 94px; height: 94px; display: grid; place-items: center; transform: translate(-50%, -50%) rotate(45deg); border: 1px solid var(--color-accent); background: var(--color-background); color: var(--color-accent); font-size: 12px; font-weight: 700; letter-spacing: .12em; }
        .relationship-center::first-line { transform: rotate(-45deg); }
        .relationship-center { padding: 20px; }

        .section-showcase { background: var(--color-surface); }
        .showcase-heading { display: grid; grid-template-columns: 1.1fr .9fr; gap: 90px; align-items: end; }
        .showcase-heading > p { margin: 0; color: var(--color-text-secondary); font-size: 16px; line-height: 1.65; }
        .product-frame { margin-top: 64px; border: 1px solid var(--color-border); background: var(--color-background); box-shadow: var(--shadow-lg); }
        .product-frame-bar { height: 38px; display: flex; align-items: center; gap: 6px; padding: 0 14px; border-bottom: 1px solid var(--color-border); }
        .frame-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--color-border); }
        .frame-path { margin-left: 12px; color: var(--color-text-secondary); font-size: 10px; letter-spacing: .08em; }
        .product-image { position: relative; aspect-ratio: 16 / 9; overflow: hidden; background: var(--color-background); }
        .product-image img { filter: saturate(.86) contrast(1.02); }
        .showcase-caption { display: flex; justify-content: space-between; margin-top: 14px; color: var(--color-text-secondary); font-size: 9px; letter-spacing: .12em; text-transform: uppercase; }

        .section-audience { background: var(--color-background); }
        .audience-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1px; margin-top: 72px; border: 1px solid var(--color-border); background: var(--color-border); }
        .audience-card { min-height: 200px; padding: 28px; background: var(--color-background); }
        .audience-mark { display: block; margin-bottom: 60px; color: var(--color-accent); font-size: 18px; }
        .audience-card:hover { background: var(--color-surface); }

        .section-access { background: var(--color-surface); }
        .access-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 120px; align-items: start; }
        .access-copy { color: var(--color-text-secondary); font-size: 17px; line-height: 1.65; }
        .access-copy > p { margin: 0 0 42px; }
        .access-rule { display: flex; align-items: center; gap: 12px; padding: 15px 0; border-top: 1px solid var(--color-border); color: var(--color-text-primary); font-size: 13px; }
        .access-rule:last-child { border-bottom: 1px solid var(--color-border); }
        .access-rule span { width: 6px; height: 6px; background: var(--color-accent); transform: rotate(45deg); }

        .final-cta { padding: 160px 0; background: var(--color-background); border-bottom: 1px solid var(--color-border); }
        .final-cta-inner { max-width: 860px; text-align: center; }
        .final-cta .eyebrow { justify-content: center; }
        .final-cta h2 { max-width: 800px; margin: 0 auto; }
        .final-cta > .landing-container > p:not(.eyebrow) { color: var(--color-text-secondary); margin: 22px 0 30px; font-size: 17px; }
        .final-cta .button { margin: 0 auto; }

        .landing-footer { background: var(--color-background); }
        .footer-inner { min-height: 120px; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 24px; }
        .footer-inner img { width: 80px; height: auto; }
        .footer-links { display: flex; gap: 24px; }
        .footer-links a, .footer-inner > span { color: var(--color-text-secondary); font-size: 11px; text-decoration: none; }
        .footer-links a:hover { color: var(--color-text-primary); }
        .footer-inner > span { justify-self: end; }

        @media (max-width: 900px) {
          .nav-links { display: none; }
          .hero { min-height: 720px; }
          .hero-signal { right: -18vw; opacity: .55; }
          .split-intro, .section-heading, .showcase-heading, .access-layout { grid-template-columns: 1fr; gap: 42px; }
          .domain-grid { grid-template-columns: repeat(2, 1fr); }
          .reason-grid { grid-template-columns: 1fr; }
          .reason-card { min-height: 210px; }
          .relationship-map { height: 470px; }
          .footer-inner { grid-template-columns: 1fr; padding: 28px 0; }
          .footer-inner > span { justify-self: start; }
        }

        @media (max-width: 640px) {
          .landing-container { width: min(calc(100% - 32px), var(--landing-max)); }
          .landing-nav { height: 68px; }
          .nav-cta { display: none; }
          .hero { min-height: 680px; }
          .hero-inner { padding-top: 68px; }
          .hero-copy { padding: 82px 0 90px; }
          .hero h1 { font-size: clamp(44px, 13vw, 68px); }
          .hero-lede { font-size: 17px; }
          .hero-actions { flex-direction: column; align-items: stretch; }
          .button { justify-content: space-between; }
          .hero-foot { display: none; }
          .section { padding: 92px 0; }
          .split-intro h2, .section h2, .final-cta h2 { font-size: 40px; }
          .domain-grid, .audience-grid { grid-template-columns: 1fr; }
          .relationship-map { height: 420px; }
          .relationship-node { width: 138px; padding: 12px; }
          .relationship-node strong { font-size: 11px; }
          .node-contract { left: 5%; top: 8%; }
          .node-people { right: 5%; top: 8%; }
          .node-release { right: 5%; bottom: 8%; }
          .node-rights { left: 5%; bottom: 8%; }
          .relationship-center { width: 76px; height: 76px; font-size: 10px; }
          .showcase-caption { flex-direction: column; gap: 6px; }
          .final-cta { padding: 110px 0; }
        }
      `}</style>
    </main>
  );
}
