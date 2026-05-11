import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      <header className="hero">
        <h1>OTTO</h1>
        <p className="tagline">
          AI-powered automation for music industry workflows
        </p>
        <button onClick={() => navigate("/register")}>
          Get Started Free
        </button>
      </header>

      <section className="value-proposition">
        <h2>Why OTTO?</h2>
        <div className="features">
          <div className="feature">
            <h3>Smart Contract Analysis</h3>
            <p>AI reviews and extracts key terms from contracts in seconds</p>
          </div>
          <div className="feature">
            <h3>Automated Workflows</h3>
            <p>Streamline releases, royalties, and rights management</p>
          </div>
          <div className="feature">
            <h3>Real-time Insights</h3>
            <p>Track streaming, sync licensing, and revenue breakdown</p>
          </div>
        </div>
      </section>

      <section className="pricing">
        <h2>Simple Pricing</h2>
        <div className="pricing-grid">
          <div className="plan">
            <h3>Free</h3>
            <p className="price">$0</p>
            <p className="period">forever</p>
            <ul>
              <li>100 jobs/month</li>
              <li>Basic contract analysis</li>
              <li>Community support</li>
            </ul>
            <button onClick={() => navigate("/register")}>Sign Up</button>
          </div>

          <div className="plan featured">
            <h3>Pro</h3>
            <p className="price">$29</p>
            <p className="period">/month</p>
            <ul>
              <li>500 jobs/month</li>
              <li>Advanced AI analysis</li>
              <li>Priority support</li>
              <li>API access</li>
            </ul>
            <button onClick={() => navigate("/register")}>Start Trial</button>
          </div>

          <div className="plan">
            <h3>Enterprise</h3>
            <p className="price">Custom</p>
            <ul>
              <li>Unlimited jobs</li>
              <li>Dedicated infrastructure</li>
              <li>Custom integrations</li>
              <li>24/7 support</li>
            </ul>
            <button onClick={() => navigate("/contact")}>Contact Us</button>
          </div>
        </div>
      </section>

      <footer className="footer">
        <p>&copy; 2026 OTTO. All rights reserved.</p>
      </footer>
    </div>
  );
}