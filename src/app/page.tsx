"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  AgentLogEntry,
  InstagramScanResult,
  InstagramAdCandidate,
  InstagramOrganicPost,
  SteeringPlan,
} from "@/lib/types";

export default function DashboardPage() {
  const [scans, setScans] = useState<InstagramScanResult[]>([]);
  const [selectedScan, setSelectedScan] = useState<InstagramScanResult | null>(null);
  const [expandedAds, setExpandedAds] = useState<Set<string>>(new Set());
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [maxScrolls, setMaxScrolls] = useState(20);
  const [maxAds, setMaxAds] = useState(20);
  const [headless, setHeadless] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  const [positivePrompt, setPositivePrompt] = useState(
    "electric kettles, tea, kitchen appliances"
  );
const [steeringHeadless, setSteeringHeadless] = useState(false);
  const [steering, setSteering] = useState(false);
  const [steeringError, setSteeringError] = useState<string | null>(null);
  const [steeringResult, setSteeringResult] = useState<{
    goalId: string;
    planId: string;
    actionCount: number;
    successCount: number;
    failureCount: number;
    plan: SteeringPlan;
    logs: AgentLogEntry[];
  } | null>(null);
  const [showSteeringLogs, setShowSteeringLogs] = useState(true);

  const loadScans = useCallback(async () => {
    try {
      const res = await fetch("/api/scans");
      const data = await res.json();
      setScans(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadScans();
  }, [loadScans]);

  const handleScan = async () => {
    setScanning(true);
    setScanError(null);
    try {
      const res = await fetch("/api/scan-instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxScrolls, maxAds, headless }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scan failed");
      await loadScans();
      const scanRes = await fetch(`/api/scans/${data.scanId}`);
      const scanData = await scanRes.json();
      setSelectedScan(scanData);
    } catch (err: unknown) {
      setScanError(err instanceof Error ? err.message : String(err));
    } finally {
      setScanning(false);
    }
  };

  const handleSelectScan = async (scanId: string) => {
    const res = await fetch(`/api/scans/${scanId}`);
    const data = await res.json();
    setSelectedScan(data);
    setExpandedAds(new Set());
    setShowLogs(false);
  };

  const handleSteering = async () => {
    setSteering(true);
    setSteeringError(null);
    setSteeringResult(null);
    try {
      const res = await fetch("/api/steering/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawPositivePrompt: positivePrompt,
          headless: steeringHeadless,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Steering failed");
      setSteeringResult(data);
    } catch (err: unknown) {
      setSteeringError(err instanceof Error ? err.message : String(err));
    } finally {
      setSteering(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedAds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <h1 style={styles.h1}>adJust</h1>
          <p style={styles.subtitle}>Adjust what ads learn about you.</p>
        </div>
      </header>

      <main style={styles.main}>
        <section style={styles.card}>
          <h2 style={styles.h2}>Run Ad Diet steering</h2>
          <p style={{ ...styles.muted, marginBottom: 12 }}>
            Creates your goal, builds an Instagram search plan, and runs it in the browser
            (many explore searches + organic post clicks). Does not click paid ads.
          </p>
          <label style={{ ...styles.label, width: "100%", maxWidth: 640 }}>
            Ads I want more of
            <textarea
              value={positivePrompt}
              onChange={(e) => setPositivePrompt(e.target.value)}
              rows={2}
              style={styles.textarea}
              placeholder="electric kettles, tea, kitchen appliances"
              disabled={steering}
            />
          </label>
<div style={{ ...styles.controls, marginTop: 12 }}>
            <label style={styles.label}>
              Headless
              <select
                value={steeringHeadless ? "true" : "false"}
                onChange={(e) => setSteeringHeadless(e.target.value === "true")}
                style={styles.input}
                disabled={steering}
              >
                <option value="false">No (show browser)</option>
                <option value="true">Yes</option>
              </select>
            </label>
          </div>
          <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={handleSteering}
              disabled={steering || !positivePrompt.trim()}
              style={steering ? styles.buttonDisabled : styles.button}
            >
              {steering ? "Running steering… (may take a while)" : "Run steering"}
            </button>
          </div>
          {steering && (
            <p style={styles.hint}>
              Browser will open on the server machine. Watch the terminal for progress
              ([progress], [click], [scroll], [sleep]). This request blocks until finished.
            </p>
          )}
          {steeringError && (
            <div style={styles.error}>
              <strong>Error:</strong> {steeringError}
              <br />
              <small>
                Tip: run{" "}
                <code>
                  npm run steering:run -- --positive=&quot;…&quot; --negative=&quot;…&quot;
                </code>{" "}
                in a terminal if the API times out.
              </small>
            </div>
          )}
          {steeringResult && (
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 14 }}>
                <strong>Done.</strong> Goal <code>{steeringResult.goalId}</code>, plan{" "}
                <code>{steeringResult.planId}</code> — {steeringResult.actionCount} steps,{" "}
                {steeringResult.successCount} succeeded, {steeringResult.failureCount} failed.
              </p>
              <p style={styles.muted}>
                Screenshots: <code>public/screenshots/{steeringResult.goalId}/</code>
              </p>
              <button
                type="button"
                onClick={() => setShowSteeringLogs((v) => !v)}
                style={{ ...styles.buttonSecondary, marginTop: 8 }}
              >
                {showSteeringLogs ? "Hide agent logs" : "Show agent logs"}
              </button>
              {showSteeringLogs && (
                <div style={{ ...styles.logBox, marginTop: 8, maxHeight: 240 }}>
                  {steeringResult.logs.map((l, i) => (
                    <div
                      key={i}
                      style={{
                        color:
                          l.status === "failed"
                            ? "#ff6b6b"
                            : l.status === "success"
                              ? "#a8e6a3"
                              : "#e0e0e0",
                      }}
                    >
                      <span style={{ opacity: 0.6, fontSize: 11 }}>
                        {l.timestamp.slice(11, 19)}
                      </span>{" "}
                      [{l.status}] {l.message}
                    </div>
                  ))}
                </div>
              )}
              <details style={{ marginTop: 12, fontSize: 13 }}>
                <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                  Planned actions ({steeringResult.plan.actions.length})
                </summary>
                <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                  {steeringResult.plan.actions.map((a) => (
                    <li key={a.id} style={{ marginBottom: 4 }}>
                      <strong>{a.type}</strong>{" "}
                      {a.query ?? a.url ?? a.reason}
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          )}
        </section>

        <section style={styles.scanPanel}>
          {/* Panel header */}
          <div style={styles.scanPanelHeader}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <span style={styles.eyebrow}>Current MVP</span>
                <h2 style={styles.scanTitle}>Instagram Feed Analyzer</h2>
                <p style={styles.scanDesc}>
                  Detect sponsored posts from the DOM, save screenshots, and review your current ad snapshot.
                </p>
              </div>
              <div style={styles.badges}>
                <span style={styles.badge}>No paid ad clicks</span>
                <span style={styles.badge}>No login automation</span>
                <span style={styles.badge}>No OCR</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div style={styles.scanBody}>
            <div style={styles.controls}>
              <label style={styles.label}>
                Max scrolls
                <input type="number" min={1} max={100} value={maxScrolls}
                  onChange={(e) => setMaxScrolls(Number(e.target.value))} style={styles.input} />
              </label>
              <label style={styles.label}>
                Max ads
                <input type="number" min={1} max={100} value={maxAds}
                  onChange={(e) => setMaxAds(Number(e.target.value))} style={styles.input} />
              </label>
              <label style={styles.label}>
                Headless
                <select value={headless ? "true" : "false"}
                  onChange={(e) => setHeadless(e.target.value === "true")} style={styles.input}>
                  <option value="false">No (show browser)</option>
                  <option value="true">Yes</option>
                </select>
              </label>
            </div>

            <div style={{ marginTop: 20, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <button onClick={handleScan} disabled={scanning}
                style={scanning ? styles.buttonDisabled : styles.buttonPrimary}>
                {scanning ? "Scanning feed…" : "Run Instagram scan"}
              </button>
              <button onClick={loadScans} style={styles.buttonSecondary}>Refresh</button>
              {!scanning && !scanError && (
                <span style={styles.statusReady}>● Ready</span>
              )}
              {scanning && (
                <span style={styles.statusRunning}>● Running</span>
              )}
            </div>

            {scanning && (
              <p style={styles.hint}>
                A browser window has opened. Log in if prompted, then press Enter in the terminal.
              </p>
            )}
            {scanError && (
              <div style={styles.errorBox}>
                <strong>Failed —</strong> {scanError}
                <br />
                <small style={{ opacity: 0.8 }}>Run <code>npm run scan:instagram</code> in the terminal, then Refresh.</small>
              </div>
            )}
          </div>

          {/* Safety note */}
          <div style={styles.safetyNote}>
            adJust inspects visible sponsored posts in your own browser session. It does not click paid ads,
            automate login, bypass platform protections, or use OCR.
          </div>
        </section>

        <div style={styles.twoCol}>
          <section style={{ ...styles.card, minWidth: 280 }}>
            <h2 style={styles.h2}>Previous scans ({scans.length})</h2>
            {scans.length === 0 && <p style={styles.muted}>No scans yet. Run a scan above.</p>}
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Scan ID</th>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Ads</th>
                  <th style={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {scans.map((s) => (
                  <tr key={s.scanId} style={selectedScan?.scanId === s.scanId ? styles.trSelected : styles.tr}>
                    <td style={styles.td}><code style={{ fontSize: 11 }}>{s.scanId.slice(0, 20)}</code></td>
                    <td style={styles.td}>{new Date(s.startedAt).toLocaleString()}</td>
                    <td style={styles.td}>{s.detectedAds.length}</td>
                    <td style={styles.td}>
                      <button onClick={() => handleSelectScan(s.scanId)} style={styles.linkBtn}>Open</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {selectedScan && (
            <section style={{ ...styles.card, flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <h2 style={styles.h2}>{selectedScan.scanId} &mdash; {selectedScan.detectedAds.length} ads detected</h2>
                <button onClick={() => setShowLogs((v) => !v)} style={styles.buttonSecondary}>
                  {showLogs ? "Hide logs" : "Show scan logs"}
                </button>
              </div>
              <p style={{ ...styles.muted, marginBottom: 12 }}>
                {new Date(selectedScan.startedAt).toLocaleString()} — {new Date(selectedScan.finishedAt).toLocaleString()}
                {" | "}Scrolls: {selectedScan.requestedScrolls}
              </p>
              {showLogs && (
                <div style={styles.logBox}>
                  {selectedScan.logs.map((l, i) => (
                    <div key={i} style={{ color: l.level === "error" ? "#c0392b" : l.level === "warn" ? "#e67e22" : "#2c3e50" }}>
                      <span style={{ opacity: 0.6, fontSize: 11 }}>{l.timestamp.slice(11, 19)}</span>{" "}
                      <span style={{ fontWeight: 600 }}>[{l.level.toUpperCase()}]</span> {l.message}
                    </div>
                  ))}
                </div>
              )}
              <h3 style={{ ...styles.h2, fontSize: 15, marginBottom: 8 }}>Ads ({selectedScan.detectedAds.length})</h3>
              {selectedScan.detectedAds.length === 0 ? (
                <p style={styles.muted}>No sponsored posts detected in this scan.</p>
              ) : (
                <AdTable ads={selectedScan.detectedAds} expandedAds={expandedAds} onToggle={toggleExpand} />
              )}
              {(selectedScan.organicPosts ?? []).length > 0 && (
                <>
                  <h3 style={{ ...styles.h2, fontSize: 15, marginTop: 28, marginBottom: 8 }}>
                    Organic posts ({selectedScan.organicPosts.length})
                  </h3>
                  <OrganicGrid posts={selectedScan.organicPosts} />
                </>
              )}
            </section>
          )}
        </div>
      </main>

      <footer style={styles.footer}>
        <p>
          This tool is for inspecting the ads shown to the logged-in user.
          It does not click paid ads. It does not automate login. It does not bypass platform access controls.
          It extracts visible text and links from the page DOM where available.
        </p>
      </footer>
    </div>
  );
}

function OrganicGrid({ posts }: { posts: InstagramOrganicPost[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
      {posts.map((post) => (
        <div key={post.id} style={styles.organicCard}>
          {post.screenshotPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.screenshotPath} alt="organic post"
              style={{ width: "100%", display: "block", borderRadius: "4px 4px 0 0", cursor: "pointer" }}
              onClick={() => window.open(post.screenshotPath, "_blank")} />
          ) : (
            <div style={{ height: 80, background: "#eee", borderRadius: "4px 4px 0 0", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={styles.muted}>no screenshot</span>
            </div>
          )}
          <div style={{ padding: "6px 8px", fontSize: 12 }}>
            {post.authorHandle ? (
              <a href={`https://www.instagram.com/${post.authorHandle}/`} target="_blank" rel="noreferrer">
                @{post.authorHandle}
              </a>
            ) : <span style={styles.muted}>unknown</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function AdTable({ ads, expandedAds, onToggle }: {
  ads: InstagramAdCandidate[];
  expandedAds: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Screenshot</th>
            <th style={styles.th}>Advertiser</th>
            <th style={styles.th}>CTA</th>
            <th style={styles.th}>Raw text preview</th>
            <th style={styles.th}>Links</th>
            <th style={styles.th}>Post URLs</th>
            <th style={styles.th}>Warnings</th>
            <th style={styles.th}></th>
          </tr>
        </thead>
        <tbody>
          {ads.map((ad) => (
            <>
              <tr key={ad.id} style={styles.tr}>
                <td style={styles.td}>
                  {ad.screenshotPath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ad.screenshotPath} alt="ad screenshot"
                      style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 4, cursor: "pointer" }}
                      onClick={() => window.open(ad.screenshotPath, "_blank")} />
                  ) : <span style={styles.muted}>—</span>}
                </td>
                <td style={styles.td}>
                  {ad.advertiserHandle ? (
                    <a href={`https://www.instagram.com/${ad.advertiserHandle}/`} target="_blank" rel="noreferrer">
                      @{ad.advertiserHandle}
                    </a>
                  ) : <span style={styles.muted}>unknown</span>}
                </td>
                <td style={styles.td}>{ad.ctaText ?? <span style={styles.muted}>—</span>}</td>
                <td style={styles.td}>
                  <span style={{ fontSize: 12 }}>{ad.rawText.slice(0, 120)}{ad.rawText.length > 120 ? "…" : ""}</span>
                </td>
                <td style={styles.td}>{ad.links.length}</td>
                <td style={styles.td}>{ad.postUrls.length}</td>
                <td style={styles.td}>
                  {ad.extractionWarnings.length > 0 ? (
                    <span style={{ color: "#e67e22", fontSize: 12 }}>{ad.extractionWarnings.length}</span>
                  ) : <span style={styles.muted}>—</span>}
                </td>
                <td style={styles.td}>
                  <button onClick={() => onToggle(ad.id)} style={styles.linkBtn}>
                    {expandedAds.has(ad.id) ? "Collapse" : "Expand"}
                  </button>
                </td>
              </tr>
              {expandedAds.has(ad.id) && (
                <tr key={`${ad.id}-exp`} style={{ background: "#f0f4ff" }}>
                  <td colSpan={8} style={{ ...styles.td, padding: 16 }}>
                    <AdExpanded ad={ad} />
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdExpanded({ ad }: { ad: InstagramAdCandidate }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div><strong>Detected at:</strong> {ad.detectedAt}</div>
      <div><strong>Sponsored label found:</strong> {ad.sponsoredLabelFound ? "Yes" : "No"}</div>
      {ad.advertiserHandle && <div><strong>Advertiser handle:</strong> @{ad.advertiserHandle}</div>}
      <div>
        <strong>Full raw text:</strong>
        <pre style={styles.pre}>{ad.rawText}</pre>
      </div>
      {ad.links.length > 0 && (
        <div>
          <strong>All links ({ad.links.length}):</strong>
          <ul style={{ marginTop: 4, paddingLeft: 20, fontSize: 12 }}>
            {ad.links.map((l, i) => (
              <li key={i}>
                <a href={l.startsWith("http") ? l : `https://www.instagram.com${l}`} target="_blank" rel="noreferrer">{l}</a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {ad.postUrls.length > 0 && (
        <div>
          <strong>Post URLs ({ad.postUrls.length}):</strong>
          <ul style={{ marginTop: 4, paddingLeft: 20, fontSize: 12 }}>
            {ad.postUrls.map((l, i) => (
              <li key={i}>
                <a href={l.startsWith("http") ? l : `https://www.instagram.com${l}`} target="_blank" rel="noreferrer">{l}</a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {ad.extractionWarnings.length > 0 && (
        <div>
          <strong>Extraction warnings:</strong>
          <ul style={{ marginTop: 4, paddingLeft: 20, fontSize: 12, color: "#c0392b" }}>
            {ad.extractionWarnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}
      {ad.screenshotPath && (
        <div>
          <strong>Full screenshot:</strong><br />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ad.screenshotPath} alt="full ad screenshot"
            style={{ maxWidth: "100%", marginTop: 8, borderRadius: 4, border: "1px solid #ddd" }} />
        </div>
      )}
    </div>
  );
}

const styles = {
  // ── Page chrome ──────────────────────────────────────────────────────────
  header: { background: "#ffffff", borderBottom: "1px solid #e5e7eb", color: "#111827", padding: "18px 24px" },
  headerInner: { maxWidth: 1100, margin: "0 auto" },
  h1: { fontSize: 22, fontWeight: 700, marginBottom: 2, letterSpacing: "-0.3px" },
  h2: { fontSize: 18, fontWeight: 600, marginBottom: 12 },
  subtitle: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  main: { maxWidth: 1100, margin: "0 auto", padding: "28px 16px", flex: 1, background: "#f5f6f8", minHeight: "calc(100vh - 64px)" },
  twoCol: { display: "flex", gap: 20, flexWrap: "wrap" as const, marginTop: 20 },
  card: { background: "white", borderRadius: 10, padding: 20, border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" },

  // ── Scan panel ───────────────────────────────────────────────────────────
  scanPanel: {
    background: "white",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    overflow: "hidden" as const,
    marginBottom: 0,
  },
  scanPanelHeader: {
    padding: "20px 24px 18px",
    borderBottom: "1px solid #f0f0f0",
    background: "#fafafa",
  },
  scanBody: { padding: "20px 24px" },
  eyebrow: {
    display: "inline-block" as const,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    color: "#2563eb",
    marginBottom: 6,
  },
  scanTitle: { fontSize: 17, fontWeight: 700, color: "#111827", marginBottom: 4 },
  scanDesc: { fontSize: 13, color: "#6b7280", lineHeight: 1.5, maxWidth: 520 },
  badges: { display: "flex", gap: 6, flexWrap: "wrap" as const, alignItems: "flex-start" },
  badge: {
    fontSize: 11,
    fontWeight: 500,
    color: "#374151",
    background: "#f3f4f6",
    border: "1px solid #e5e7eb",
    borderRadius: 20,
    padding: "3px 10px",
    whiteSpace: "nowrap" as const,
  },
  safetyNote: {
    borderTop: "1px solid #f0f0f0",
    padding: "12px 24px",
    fontSize: 12,
    color: "#9ca3af",
    lineHeight: 1.55,
    background: "#fafafa",
  },
  statusReady:  { fontSize: 12, fontWeight: 500, color: "#16a34a" },
  statusRunning: { fontSize: 12, fontWeight: 500, color: "#2563eb" },
  errorBox: {
    marginTop: 14,
    background: "#fffbf0",
    border: "1px solid #f59e0b",
    borderRadius: 6,
    padding: "10px 14px",
    fontSize: 13,
    color: "#92400e",
    lineHeight: 1.5,
  },

  // ── Shared form elements ──────────────────────────────────────────────────
  controls: { display: "flex", gap: 20, flexWrap: "wrap" as const, marginTop: 8 },
  label: { display: "flex", flexDirection: "column" as const, gap: 4, fontSize: 13, fontWeight: 500, color: "#374151" },
  input: { marginTop: 2, padding: "6px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14, width: 150, color: "#111827", background: "white" },
  textarea: { marginTop: 2, padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14, width: "100%", fontFamily: "inherit", resize: "vertical" as const },
  buttonPrimary: { background: "#2563eb", color: "white", border: "none", borderRadius: 7, padding: "9px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  button:        { background: "#2563eb", color: "white", border: "none", borderRadius: 7, padding: "9px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  buttonDisabled: { background: "#d1d5db", color: "#9ca3af", border: "none", borderRadius: 7, padding: "9px 22px", fontSize: 14, fontWeight: 600, cursor: "not-allowed" },
  buttonSecondary: { background: "white", color: "#374151", border: "1px solid #d1d5db", borderRadius: 7, padding: "8px 16px", fontSize: 13, cursor: "pointer" },
  linkBtn: { background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: 13, padding: "2px 6px", borderRadius: 4 },
  hint: { marginTop: 10, fontSize: 13, color: "#6b7280", fontStyle: "italic" },
  error: { marginTop: 12, background: "#fffbf0", border: "1px solid #f59e0b", borderRadius: 6, padding: 12, fontSize: 13, color: "#92400e" },
  muted: { color: "#9ca3af", fontSize: 13 },

  // ── Results ───────────────────────────────────────────────────────────────
  organicCard: { width: 160, border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" as const, background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 13 },
  th: { textAlign: "left" as const, padding: "8px 10px", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", fontWeight: 600, whiteSpace: "nowrap" as const, color: "#374151" },
  td: { padding: "8px 10px", borderBottom: "1px solid #f3f4f6", verticalAlign: "top" as const },
  tr: { cursor: "default" },
  trSelected: { background: "#eff6ff", cursor: "default" },
  pre: { background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 4, padding: 10, fontSize: 12, whiteSpace: "pre-wrap" as const, wordBreak: "break-word" as const, maxHeight: 300, overflowY: "auto" as const, marginTop: 4 },
  logBox: { background: "#1e1e2e", color: "#e0e0e0", borderRadius: 6, padding: 12, fontSize: 12, fontFamily: "monospace", maxHeight: 300, overflowY: "auto" as const, marginBottom: 16, lineHeight: 1.7 },
  footer: { background: "#f9fafb", borderTop: "1px solid #e5e7eb", padding: "16px 24px", textAlign: "center" as const, fontSize: 12, color: "#9ca3af" },
};
