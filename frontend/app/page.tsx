"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  PlayCircle,
  ShieldCheck,
  TrendingUp,
  Gift,
  ChartNoAxesCombined,
  BrainCircuit,
  MessagesSquare,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Brand, Modal } from "../components/ui";
export default function Landing() {
  const [demo, setDemo] = useState(false);
  return (
    <div className="landing">
      <header className="landing-nav">
        <Brand />
        <nav>
          <a href="#product">Product</a>
          <a href="#features">Features</a>
          <a href="#how-it-works">How it Works</a>
          <a href="#results">Results</a>
        </nav>
        <Link href="/login" className="button primary">
          Get Started <ArrowRight size={14} />
        </Link>
      </header>
      <main>
        <section className="hero" id="product">
          <div className="hero-copy">
            <span className="badge blue-badge">
              <Sparkles size={12} /> SMARTER RETENTION STARTS HERE
            </span>
            <h1>
              Turn Customer Risk
              <br />
              into <span>Lasting Loyalty.</span>
            </h1>
            <p>
              ChurnGuardAI uses AI to detect at-risk customers from purchase
              behavior and support conversations, create personalized retention
              offers, and help your team keep more customers.
            </p>
            <div className="actions">
              <Link className="button primary" href="/login">
                Get Started <ArrowRight size={16} />
              </Link>
              <button className="button" onClick={() => setDemo(true)}>
                <PlayCircle size={17} className="blue" />
                Watch Demo
              </button>
            </div>
            <div className="hero-trust">
              <ShieldCheck size={14} />
              Explainable insights. Personalized offers. You stay in control.
            </div>
            <div className="hero-metrics">
              <div>
                <strong>Proactive</strong>
                <small>Catch risk before churn</small>
              </div>
              <div>
                <strong>Real-time</strong>
                <small>Understand every conversation</small>
              </div>
              <div>
                <strong>AI-Powered</strong>
                <small>Personalized retention</small>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <Image
              src="/images/customer-hero.png"
              alt="A happy customer checking her phone"
              width={1254}
              height={1254}
              priority
            />
            <div className="floating-card top">
              <TrendingUp size={30} />
              <div>
                <p>Customer relationships</p>
                <strong>Worth keeping.</strong>
              </div>
            </div>
            <div className="floating-card gift">
              <div>
                <p>Personalized offer</p>
                <strong>20% OFF</strong>
                <p>Just for you · example</p>
              </div>
              <Gift size={43} />
            </div>
            <div className="floating-card bottom">
              <ChartNoAxesCombined size={27} />
              <strong>
                AI identifies
                <br />
                at-risk customers
              </strong>
            </div>
          </div>
        </section>
        <section className="landing-section" id="features">
          <div className="section-title">
            <p className="eyebrow">A LITTLE INSIGHT. A LASTING CONNECTION.</p>
            <h2>
              Know who needs you.
              <br />
              Know what to do next.
            </h2>
            <p>
              Bring customer signals, support conversations, and retention
              decisions into one thoughtful workspace.
            </p>
          </div>
          <div className="feature-grid">
            {[
              [
                BrainCircuit,
                "See the risk early",
                "Understand purchase patterns and the factors behind every churn score. Turn uncertainty into a clear next step.",
              ],
              [
                MessagesSquare,
                "Listen beyond the ticket",
                "Detect customer sentiment, prioritize urgent conversations, and draft helpful, grounded support responses.",
              ],
              [
                Gift,
                "Make the right gesture",
                "Review personalized offers, adjust the message, and approve discounts within the rules you set.",
              ],
            ].map(([Icon, title, copy]) => {
              const I = Icon as typeof Gift;
              return (
                <article className="feature-card" key={String(title)}>
                  <span>
                    <I size={23} />
                  </span>
                  <h3>{String(title)}</h3>
                  <p>{String(copy)}</p>
                </article>
              );
            })}
          </div>
        </section>
        <section className="landing-section" id="how-it-works">
          <div className="section-title">
            <p className="eyebrow">FROM SIGNAL TO ACTION</p>
            <h2>A smarter way to keep customers.</h2>
          </div>
          <div className="steps">
            {[
              [
                "Understand",
                "Bring purchase activity and support conversations together.",
              ],
              [
                "Detect",
                "Identify risk with behavioral scoring and sentiment analysis.",
              ],
              [
                "Personalize",
                "Create a relevant offer with explainable reasoning.",
              ],
              [
                "Review & retain",
                "Keep your team in control of every retention decision.",
              ],
            ].map(([title, copy], i) => (
              <div key={title}>
                <div className="step-number">0{i + 1}</div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="landing-section" id="results">
          <div className="landing-cta">
            <h2>Make every customer connection count.</h2>
            <p>
              Explore your customer insights, review retention opportunities,
              and see your team’s results in one place.
            </p>
            <Link className="button primary" href="/login">
              Open your workspace <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <Brand />
        <span>
          Built for lasting customer relationships.
          <br />
          Local development preview.
        </span>
      </footer>
      {demo && (
        <Modal
          title="Meet your retention workspace"
          onClose={() => setDemo(false)}
        >
          <p className="muted" style={{ fontSize: 13, marginBottom: 20 }}>
            A quick product walkthrough
          </p>
          {[
            "Start with the dashboard to see customer risk and retention trends.",
            "Open a customer profile to understand the factors behind their score.",
            "Simulate a support ticket to see sentiment analysis and agent responses.",
            "Review the generated offer, edit it, then approve or reject it.",
          ].map((v, i) => (
            <div className="setting-row" key={v}>
              <CheckCircle2 size={18} className="blue" />
              <span>
                {i + 1}. {v}
              </span>
            </div>
          ))}
          <div className="actions">
            <Link className="button primary" href="/login">
              Try the local workspace <ArrowRight size={15} />
            </Link>
          </div>
        </Modal>
      )}
    </div>
  );
}
