import Image from "next/image";
import Link from "next/link";
import ContactForm from "@/components/marketing/ContactForm";

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
          </div>
        </div>
      </nav>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-image" aria-hidden="true">
          <Image
            src="/assets/otto-hero-abstract.webp"
            alt=""
            fill
            priority
            sizes="(max-width: 900px) 100vw, 62vw"
            style={{ objectFit: "cover", objectPosition: "center center" }}
          />
        </div>
        <div className="hero-overlay" aria-hidden="true" />

        <div className="landing-container hero-inner">
          <div className="hero-copy">
            <p className="eyebrow"><span /> Music operations infrastructure</p>
            <h1 id="hero-title">The operating system for the work behind music.</h1>
            <p className="hero-lede">
              OTTO keeps contracts, releases, people, rights and documents together — and connects them to the organisations and work they belong to.
            </p>
            <div className="hero-actions">
              <a href="#product" className="button button-primary">Explore OTTO</a>
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
            <div className="relationship-line line-five" />
            <div className="relationship-node node-contract"><small>CONTRACT</small><strong>Agreement</strong></div>
            <div className="relationship-node node-people"><small>PEOPLE</small><strong>Artists &amp; contacts</strong></div>
            <div className="relationship-node node-release"><small>RELEASE</small><strong>Catalogue</strong></div>
            <div className="relationship-node node-rights"><small>RIGHTS</small><strong>Ownership</strong></div>
            <div className="relationship-node node-documents"><small>DOCUMENTS</small><strong>Source files</strong></div>
            <div className="relationship-center"><span>OTTO</span></div>
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

      <section className="final-cta" id="contact">
        <div className="landing-container contact-layout">
          <div className="contact-copy">
            <p className="eyebrow">Talk to us</p>
            <h2>Interested in OTTO?</h2>
            <p>
              Tell us a little about yourself and your organisation. We&apos;ll get back to you to talk through what you need.
            </p>
          </div>
          <ContactForm />
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
    </main>
  );
}
