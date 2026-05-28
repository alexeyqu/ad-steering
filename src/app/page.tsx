"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const SCAN_STEPS = [
  { delay: 0,    type: "cmd",  text: "$ npm run scan:instagram" },
  { delay: 800,  type: "info", text: "Opening Instagram in Chromium…" },
  { delay: 1500, type: "info", text: "Feed loaded. Scroll 3 / 20" },
  { delay: 2200, type: "ad",   handle: "marcusbygoldmansachs", cta: "Learn more",  preview: "Save smarter with Marcus." },
  { delay: 3000, type: "ad",   handle: "freetrade",            cta: "Sign up",     preview: "Commission-free investing." },
  { delay: 3800, type: "ad",   handle: "lloydsbank",           cta: "Apply now",   preview: "Start your financial journey." },
  { delay: 4700, type: "done", text: "Scan complete. 3 ads detected." },
];

export default function LandingPage() {
  const [step, setStep] = useState(-1);

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const run = () => {
      setStep(-1);
      SCAN_STEPS.forEach((s, i) => {
        timeouts.push(setTimeout(() => setStep(i), s.delay + 600));
      });
      timeouts.push(setTimeout(() => { run(); }, 8500));
    };

    const boot = setTimeout(run, 400);
    return () => { clearTimeout(boot); timeouts.forEach(clearTimeout); };
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="ld">

        {/* ── NAV ─────────────────────────────────────────────── */}
        <nav className="ld-nav">
          <div className="ld-wrap ld-nav-inner">
            <span className="ld-logo">AD DIET</span>
            <div className="ld-nav-right">
              <a href="#how" className="ld-nav-link">How it works</a>
              <a href="https://github.com/alexeyqu/ad-steering" target="_blank" rel="noreferrer" className="ld-nav-link">GitHub</a>
              <Link href="/dashboard" className="ld-pill-cta">Open Scanner →</Link>
            </div>
          </div>
        </nav>

        {/* ── HERO ────────────────────────────────────────────── */}
        <section className="ld-hero">
          <div className="ld-wrap ld-hero-grid">

            <div className="ld-hero-copy">
              <div className="ld-eyebrow">Feed Intelligence</div>
              <h1 className="ld-h1">
                See every ad<br />
                <em>they show you.</em>
              </h1>
              <p className="ld-lead">
                Ad Diet opens Instagram in a real browser, scrolls your feed, and
                surfaces every sponsored post — extracting handles, CTAs, and screenshots
                directly from the visible DOM. No OCR. No guessing.
              </p>
              <div className="ld-ctas">
                <Link href="/dashboard" className="ld-btn-accent">Open Scanner</Link>
                <a href="https://github.com/alexeyqu/ad-steering" target="_blank" rel="noreferrer" className="ld-btn-ghost">View on GitHub ↗</a>
              </div>
            </div>

            <div className="ld-hero-terminal">
              <div className="ld-term">
                <div className="ld-term-bar">
                  <span className="ld-dot ld-dot-r" />
                  <span className="ld-dot ld-dot-y" />
                  <span className="ld-dot ld-dot-g" />
                  <span className="ld-term-title">ad-diet — scan</span>
                </div>
                <div className="ld-term-body">
                  {SCAN_STEPS.map((s, i) => {
                    if (i > step) return null;
                    if (s.type === "cmd") return (
                      <div key={i} className="ld-tline ld-tline-cmd">{s.text}</div>
                    );
                    if (s.type === "info") return (
                      <div key={i} className="ld-tline ld-tline-muted">{s.text}</div>
                    );
                    if (s.type === "ad") return (
                      <div key={i} className="ld-tline ld-tline-ad">
                        <span className="ld-ad-badge">Ad</span>
                        <span className="ld-t-handle">@{s.handle}</span>
                        <span className="ld-t-cta">{s.cta}</span>
                        <span className="ld-t-preview">{s.preview}</span>
                      </div>
                    );
                    if (s.type === "done") return (
                      <div key={i} className="ld-tline ld-tline-done">✓ {s.text}</div>
                    );
                    return null;
                  })}
                  {step >= 0 && step < SCAN_STEPS.length - 1 && (
                    <span className="ld-cursor">█</span>
                  )}
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ── TRUST STRIP ──────────────────────────────────────── */}
        <div className="ld-trust-wrap">
          <div className="ld-wrap ld-trust">
            {["DOM only", "No OCR", "No ad clicks", "Playwright", "No credential storage", "Open source", "Privacy first", "TypeScript"].map((t) => (
              <span key={t} className="ld-trust-pill">{t}</span>
            ))}
          </div>
        </div>

        {/* ── HOW IT WORKS ─────────────────────────────────────── */}
        <section className="ld-section" id="how">
          <div className="ld-wrap">
            <div className="ld-section-hd">
              <div className="ld-eyebrow">Process</div>
              <h2 className="ld-h2">Three steps to full clarity.</h2>
            </div>
            <div className="ld-steps">
              {[
                {
                  n: "01", title: "Scan",
                  body: "Opens Instagram in a real Chromium browser. You log in manually — Ad Diet never touches your credentials. The feed scrolls at human pace with randomised delays.",
                },
                {
                  n: "02", title: "Detect",
                  body: <>Every <code className="ld-code">article</code> element is checked for the &ldquo;Ad&rdquo; label in visible DOM text. Matches are deduped by a SHA-256 hash of handle&nbsp;+&nbsp;content.</>,
                },
                {
                  n: "03", title: "Inspect",
                  body: "Advertiser handle, CTA text, raw copy, all links, and a screenshot per ad — saved as structured JSON. View everything in the dashboard alongside organic posts.",
                },
              ].map(({ n, title, body }) => (
                <div key={n} className="ld-step">
                  <div className="ld-step-n">{n}</div>
                  <h3 className="ld-step-title">{title}</h3>
                  <p className="ld-step-body">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── WHY IT MATTERS ───────────────────────────────────── */}
        <section className="ld-why">
          <div className="ld-wrap ld-why-grid">
            <div className="ld-why-left">
              <div className="ld-eyebrow">Why it matters</div>
              <blockquote className="ld-blockquote">
                &ldquo;The feed is a black box. You never know what percentage of
                what you see is paid content — or who paid for it.&rdquo;
              </blockquote>
            </div>
            <div className="ld-stats">
              {[
                { num: "$50B+", label: "annual Meta ad revenue harvested from user attention" },
                { num: "2B+",   label: "Instagram users shown ads with zero visibility into targeting" },
                { num: "0",     label: "consumer tools that show you exactly what you're being sold" },
              ].map(({ num, label }) => (
                <div key={num} className="ld-stat">
                  <div className="ld-stat-num">{num}</div>
                  <div className="ld-stat-label">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── ETHICS ───────────────────────────────────────────── */}
        <section className="ld-section ld-section-border-top">
          <div className="ld-wrap">
            <div className="ld-ethics">
              <div className="ld-ethics-shield">🛡</div>
              <div>
                <h3 className="ld-ethics-title">Built for transparency, not manipulation.</h3>
                <p className="ld-ethics-body">
                  Ad Diet never clicks paid ads, never automates login, and never bypasses platform access controls.
                  It reads only what you can already see — extracting visible text and links from the DOM,
                  as any user would. Your session data stays entirely on your machine.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────── */}
        <section className="ld-cta">
          <div className="ld-wrap ld-cta-inner">
            <h2 className="ld-cta-h2">Know exactly what you&rsquo;re being sold.</h2>
            <p className="ld-cta-sub">Run your first Instagram scan in under two minutes.</p>
            <Link href="/dashboard" className="ld-btn-accent ld-btn-lg">Open Scanner →</Link>
          </div>
        </section>

        {/* ── FOOTER ───────────────────────────────────────────── */}
        <footer className="ld-footer">
          <div className="ld-wrap ld-footer-inner">
            <span className="ld-logo ld-logo-sm">AD DIET</span>
            <span className="ld-footer-tag">Feed intelligence for everyone.</span>
            <div className="ld-footer-links">
              <Link href="/dashboard" className="ld-footer-link">Dashboard</Link>
              <a href="https://github.com/alexeyqu/ad-steering" target="_blank" rel="noreferrer" className="ld-footer-link">GitHub</a>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap');

:root {
  --bg:      #07070C;
  --surf:    #0D0D18;
  --surf2:   #131320;
  --bdr:     rgba(255,255,255,0.065);
  --bdr2:    rgba(255,255,255,0.12);
  --lime:    #CAFF33;
  --lime-d:  rgba(202,255,51,0.10);
  --lime-gl: rgba(202,255,51,0.22);
  --txt:     #EDEAE2;
  --muted:   #68657A;
  --muted2:  #3E3D50;
  --red:     #FF3352;
  --red-d:   rgba(255,51,82,0.10);
}

/* ── BASE ── */
.ld,
.ld * { box-sizing: border-box; margin: 0; padding: 0; }

.ld {
  background: var(--bg);
  color: var(--txt);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px;
  line-height: 1.6;
  min-height: 100vh;
  overflow-x: hidden;
}

.ld-wrap {
  max-width: 1200px;
  margin: 0 auto;
  padding-inline: clamp(20px, 5vw, 72px);
}

/* subtle dot-grid background */
.ld::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: radial-gradient(rgba(255,255,255,0.028) 1px, transparent 1px);
  background-size: 36px 36px;
  pointer-events: none;
  z-index: 0;
}
.ld > * { position: relative; z-index: 1; }

/* ── NAV ── */
.ld-nav {
  position: sticky; top: 0; z-index: 100;
  background: rgba(7,7,12,0.80);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--bdr);
}
.ld-nav-inner {
  height: 58px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.ld-logo {
  font-family: 'Syne', sans-serif;
  font-weight: 800;
  font-size: 17px;
  letter-spacing: 0.18em;
  color: var(--lime);
  text-decoration: none;
  user-select: none;
}
.ld-logo-sm { font-size: 13px; }
.ld-nav-right { display: flex; align-items: center; gap: 28px; }
.ld-nav-link {
  font-size: 13px; font-weight: 500;
  color: var(--muted); text-decoration: none;
  transition: color .18s;
}
.ld-nav-link:hover { color: var(--txt); }
.ld-pill-cta {
  font-family: 'Syne', sans-serif;
  font-weight: 700; font-size: 12px;
  letter-spacing: 0.06em;
  color: var(--bg);
  background: var(--lime);
  text-decoration: none;
  padding: 7px 16px;
  border-radius: 4px;
  transition: opacity .18s, transform .14s;
}
.ld-pill-cta:hover { opacity: .85; transform: translateY(-1px); }

/* ── HERO ── */
.ld-hero {
  padding-block: clamp(88px, 13vw, 148px);
}
.ld-hero-grid {
  display: grid;
  grid-template-columns: 56fr 44fr;
  gap: 56px;
  align-items: center;
}
@media (max-width: 880px) {
  .ld-hero-grid { grid-template-columns: 1fr; gap: 52px; }
}

.ld-eyebrow {
  font-family: 'Space Mono', monospace;
  font-size: 10px; font-weight: 700;
  letter-spacing: 0.22em; text-transform: uppercase;
  color: var(--lime);
  margin-bottom: 18px;
}
.ld-h1 {
  font-family: 'Syne', sans-serif;
  font-weight: 800;
  font-size: clamp(50px, 6.8vw, 82px);
  line-height: 1.0;
  letter-spacing: -0.025em;
  color: var(--txt);
  margin-bottom: 22px;
}
.ld-h1 em {
  font-style: italic;
  color: var(--lime);
}
.ld-lead {
  font-size: clamp(15px, 1.7vw, 18px);
  font-weight: 300;
  color: var(--muted);
  line-height: 1.75;
  max-width: 500px;
  margin-bottom: 36px;
}
.ld-ctas { display: flex; gap: 14px; flex-wrap: wrap; align-items: center; }

/* ── BUTTONS ── */
.ld-btn-accent {
  font-family: 'Syne', sans-serif;
  font-weight: 700; font-size: 14px;
  letter-spacing: 0.04em;
  color: var(--bg);
  background: var(--lime);
  text-decoration: none;
  padding: 13px 26px;
  border-radius: 4px;
  display: inline-block;
  transition: opacity .18s, transform .14s, box-shadow .2s;
}
.ld-btn-accent:hover {
  opacity: .88;
  transform: translateY(-2px);
  box-shadow: 0 8px 32px var(--lime-gl);
}
.ld-btn-lg { font-size: 16px; padding: 15px 34px; }
.ld-btn-ghost {
  font-size: 13px; font-weight: 500;
  color: var(--muted);
  text-decoration: none;
  padding: 13px 18px;
  border: 1px solid var(--bdr);
  border-radius: 4px;
  display: inline-block;
  transition: color .18s, border-color .18s;
}
.ld-btn-ghost:hover { color: var(--txt); border-color: var(--muted2); }

/* ── TERMINAL ── */
.ld-term {
  background: #080810;
  border: 1px solid var(--bdr);
  border-radius: 10px;
  overflow: hidden;
  box-shadow:
    0 30px 80px rgba(0,0,0,0.65),
    0 0 0 1px rgba(202,255,51,0.05),
    inset 0 1px 0 rgba(255,255,255,0.04);
}
.ld-term-bar {
  background: var(--surf);
  padding: 11px 14px;
  display: flex; align-items: center; gap: 6px;
  border-bottom: 1px solid var(--bdr);
}
.ld-dot { width: 11px; height: 11px; border-radius: 50%; }
.ld-dot-r { background: #FF5F57; }
.ld-dot-y { background: #FFBD2E; }
.ld-dot-g { background: #28C840; }
.ld-term-title {
  font-family: 'Space Mono', monospace;
  font-size: 11px; color: var(--muted);
  margin-left: 8px;
}
.ld-term-body {
  padding: 18px 20px;
  min-height: 250px;
  font-family: 'Space Mono', monospace;
  font-size: 12px; line-height: 1.65;
  display: flex; flex-direction: column; gap: 3px;
}

@keyframes ld-in {
  from { opacity: 0; transform: translateY(5px); }
  to   { opacity: 1; transform: translateY(0); }
}
.ld-tline { animation: ld-in .25s ease-out both; }
.ld-tline-cmd   { color: var(--lime); }
.ld-tline-muted { color: var(--muted); }
.ld-tline-done  { color: var(--lime); font-weight: 700; letter-spacing: 0.02em; }
.ld-tline-ad {
  display: flex; align-items: center; flex-wrap: wrap; gap: 8px;
  padding: 6px 10px;
  margin-block: 2px;
  background: var(--red-d);
  border-left: 2px solid var(--red);
  border-radius: 0 4px 4px 0;
}
.ld-ad-badge {
  font-size: 9px; font-weight: 700;
  letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--red);
  background: rgba(255,51,82,0.18);
  padding: 2px 6px; border-radius: 3px;
}
.ld-t-handle { color: var(--txt); font-size: 12px; }
.ld-t-cta {
  font-size: 10px; color: var(--muted);
  background: var(--surf2);
  padding: 2px 7px; border-radius: 10px;
  border: 1px solid var(--bdr);
}
.ld-t-preview { color: var(--muted); font-size: 11px; flex: 1; }

@keyframes ld-blink { 50% { opacity: 0; } }
.ld-cursor {
  color: var(--lime);
  font-size: 14px;
  animation: ld-blink 1s step-end infinite;
  margin-top: 2px;
  display: inline-block;
}

/* ── TRUST ── */
.ld-trust-wrap {
  border-top: 1px solid var(--bdr);
  border-bottom: 1px solid var(--bdr);
  background: var(--surf);
}
.ld-trust {
  display: flex; flex-wrap: wrap; gap: 10px;
  padding-block: 22px;
}
.ld-trust-pill {
  font-family: 'Space Mono', monospace;
  font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--muted);
  border: 1px solid var(--bdr);
  padding: 5px 13px; border-radius: 100px;
  background: var(--bg);
  transition: color .18s, border-color .18s;
  cursor: default;
}
.ld-trust-pill:hover { color: var(--txt); border-color: var(--muted2); }

/* ── SECTIONS ── */
.ld-section { padding-block: clamp(72px, 10vw, 120px); }
.ld-section-border-top { border-top: 1px solid var(--bdr); }
.ld-section-hd { margin-bottom: 60px; }
.ld-h2 {
  font-family: 'Syne', sans-serif;
  font-weight: 800;
  font-size: clamp(34px, 4vw, 52px);
  line-height: 1.06;
  letter-spacing: -0.02em;
  color: var(--txt);
  margin-top: 14px;
}

/* ── STEPS ── */
.ld-steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
}
@media (max-width: 800px) {
  .ld-steps { grid-template-columns: 1fr; }
  .ld-step { border-left: none !important; border-top: 1px solid var(--bdr); padding-top: 32px !important; }
  .ld-step:first-child { border-top: none; padding-top: 0 !important; }
}
.ld-step {
  padding: 0 40px 0 0;
  border-right: 1px solid var(--bdr);
  margin-right: 40px;
}
.ld-step:last-child { border-right: none; margin-right: 0; padding-right: 0; }
.ld-step-n {
  font-family: 'Syne', sans-serif;
  font-weight: 800;
  font-size: 72px;
  line-height: 1;
  color: var(--bdr2);
  letter-spacing: -0.04em;
  margin-bottom: -10px;
  user-select: none;
}
.ld-step-title {
  font-family: 'Syne', sans-serif;
  font-weight: 700; font-size: 20px;
  color: var(--txt); margin-bottom: 12px;
}
.ld-step-body {
  font-size: 14px; font-weight: 300;
  color: var(--muted); line-height: 1.75;
}
.ld-code {
  font-family: 'Space Mono', monospace; font-size: 11px;
  color: var(--lime); background: var(--lime-d);
  padding: 1px 5px; border-radius: 3px;
}

/* ── WHY ── */
.ld-why {
  background: var(--surf);
  border-top: 1px solid var(--bdr);
  border-bottom: 1px solid var(--bdr);
  padding-block: clamp(72px, 10vw, 120px);
}
.ld-why-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px; align-items: center;
}
@media (max-width: 800px) {
  .ld-why-grid { grid-template-columns: 1fr; gap: 52px; }
}
.ld-blockquote {
  font-family: 'Syne', sans-serif;
  font-weight: 700;
  font-size: clamp(20px, 2.6vw, 28px);
  line-height: 1.45;
  letter-spacing: -0.01em;
  color: var(--txt);
  border-left: 3px solid var(--lime);
  padding-left: 22px;
  font-style: italic;
}
.ld-stats { display: flex; flex-direction: column; gap: 28px; }
.ld-stat-num {
  font-family: 'Syne', sans-serif;
  font-weight: 800; font-size: 44px;
  color: var(--lime); line-height: 1;
  margin-bottom: 4px;
}
.ld-stat-label {
  font-size: 13px; font-weight: 400;
  color: var(--muted); line-height: 1.55;
  max-width: 280px;
}

/* ── ETHICS ── */
.ld-ethics {
  display: flex; gap: 26px; align-items: flex-start;
  background: var(--surf);
  border: 1px solid var(--bdr);
  border-radius: 8px;
  padding: 30px 34px;
}
.ld-ethics-shield { font-size: 26px; flex-shrink: 0; margin-top: 2px; }
.ld-ethics-title {
  font-family: 'Syne', sans-serif;
  font-weight: 700; font-size: 18px;
  color: var(--txt); margin-bottom: 8px;
}
.ld-ethics-body {
  font-size: 14px; font-weight: 300;
  color: var(--muted); line-height: 1.75;
}

/* ── CTA ── */
.ld-cta {
  padding-block: clamp(80px, 12vw, 140px);
  border-top: 1px solid var(--bdr);
}
.ld-cta-inner { text-align: center; max-width: 560px; margin: 0 auto; }
.ld-cta-h2 {
  font-family: 'Syne', sans-serif;
  font-weight: 800;
  font-size: clamp(34px, 5vw, 56px);
  line-height: 1.06; letter-spacing: -0.025em;
  color: var(--txt); margin-bottom: 14px;
}
.ld-cta-sub {
  font-size: 16px; font-weight: 300;
  color: var(--muted); margin-bottom: 32px;
}

/* ── FOOTER ── */
.ld-footer {
  border-top: 1px solid var(--bdr);
  padding-block: 26px;
}
.ld-footer-inner {
  display: flex; align-items: center; gap: 20px; flex-wrap: wrap;
}
.ld-footer-tag { font-size: 12px; color: var(--muted); flex: 1; }
.ld-footer-links { display: flex; gap: 20px; }
.ld-footer-link {
  font-size: 12px; color: var(--muted);
  text-decoration: none; transition: color .18s;
}
.ld-footer-link:hover { color: var(--txt); }

/* ── ANIMATIONS on load ── */
@keyframes ld-hero-up {
  from { opacity: 0; transform: translateY(28px); }
  to   { opacity: 1; transform: translateY(0); }
}
.ld-hero-copy > * {
  animation: ld-hero-up .6s cubic-bezier(.22,.68,0,1.2) both;
}
.ld-hero-copy > *:nth-child(1) { animation-delay: .05s; }
.ld-hero-copy > *:nth-child(2) { animation-delay: .14s; }
.ld-hero-copy > *:nth-child(3) { animation-delay: .22s; }
.ld-hero-copy > *:nth-child(4) { animation-delay: .30s; }
.ld-hero-terminal {
  animation: ld-hero-up .7s cubic-bezier(.22,.68,0,1.2) .18s both;
}
`;
