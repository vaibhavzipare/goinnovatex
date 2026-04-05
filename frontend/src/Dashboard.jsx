// Dashboard.jsx — QuantSolve v3
// Fully unified: integer-combination solver + algebraic polynomial solver with
// step-by-step trace, combinations table, and curve graph.

import { useState, useCallback, useMemo } from "react";
import BestSolutionCard from "./components/BestSolutionCard";
import InvestmentSummary from "./components/InvestmentSummary";
import SolutionChart, { PolynomialChart } from "./components/SolutionChart";

const API = "https://goinnovatex.onrender.com/solve";
const PAGE_SIZE = 50;
const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];

// ── Shared styles ─────────────────────────────────────────────────────────────
const S = {
  dash:       { background: "#060d1a", minHeight: "100vh", color: "#e2e8f0", fontFamily: "'JetBrains Mono','Fira Code',monospace" },
  topbar:     { background: "#0a1628", borderBottom: "1px solid #1e2d4a", padding: "0 24px", display: "flex", alignItems: "center", gap: 16, height: 52, position: "sticky", top: 0, zIndex: 100 },
  logo:       { fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: 3, display: "flex", alignItems: "center", gap: 8 },
  logoSpan:   { color: "#3b82f6" },
  sub:        { fontSize: 10, color: "#334155", letterSpacing: 2 },
  main:       { display: "grid", gridTemplateColumns: "300px 1fr 300px", minHeight: "calc(100vh - 52px)", gap: 0 },
  leftPanel:  { background: "#0a1628", borderRight: "1px solid #1e2d4a", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" },
  center:     { padding: 20, display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" },
  rightPanel: { background: "#0a1628", borderLeft: "1px solid #1e2d4a", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" },
  label:      { fontSize: 10, letterSpacing: "1.5px", color: "#334155", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 },
  eqInput:    { background: "#060d1a", border: "1px solid #1e3a5f", borderRadius: 6, padding: "10px 14px", color: "#60a5fa", fontFamily: "monospace", fontSize: 13, width: "100%", outline: "none", boxSizing: "border-box" },
  section:    { background: "#060d1a", border: "1px solid #1e2d4a", borderRadius: 8, padding: "12px 14px" },
  varRow:     { display: "flex", alignItems: "center", gap: 8, padding: "5px 0" },
  varBadge:   { background: "#1e3a5f", color: "#60a5fa", fontFamily: "monospace", fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 4, minWidth: 24, textAlign: "center" },
  smallIn:    { background: "#0a0f1e", border: "1px solid #1e3a5f", borderRadius: 4, color: "#94a3b8", fontFamily: "monospace", fontSize: 12, padding: "3px 7px", width: 70, textAlign: "center", outline: "none" },
  opSel:      { background: "#0a0f1e", border: "1px solid #1e3a5f", borderRadius: 4, color: "#94a3b8", fontSize: 12, padding: "3px 5px", outline: "none" },
  solveBtn:   { background: "linear-gradient(135deg,#1d4ed8,#2563eb)", color: "#fff", border: "none", borderRadius: 8, padding: "12px", fontSize: 13, fontWeight: 700, width: "100%", cursor: "pointer", letterSpacing: 1, marginTop: "auto", textTransform: "uppercase" },
  stats:      { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 },
  stat:       { background: "#0a1628", border: "1px solid #1e2d4a", borderRadius: 8, padding: "12px 14px" },
  statN:      { fontSize: 20, fontWeight: 700, color: "#3b82f6", fontFamily: "monospace" },
  statL:      { fontSize: 9, color: "#334155", marginTop: 2, textTransform: "uppercase", letterSpacing: 1 },
  tableWrap:  { overflowX: "auto", overflowY: "auto", maxHeight: 340 },
  th:         { background: "#0a1628", color: "#334155", padding: "8px 14px", textAlign: "left", fontSize: 10, letterSpacing: 1, textTransform: "uppercase", borderBottom: "1px solid #1e2d4a", position: "sticky", top: 0, cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" },
  td:         { padding: "6px 14px", borderBottom: "1px solid #0a1628", color: "#94a3b8", fontFamily: "monospace", fontSize: 12 },
  addBtn:     { background: "transparent", border: "1px dashed #1e3a5f", borderRadius: 4, color: "#475569", fontSize: 11, padding: "5px 10px", cursor: "pointer", width: "100%", marginTop: 6 },
  warn:       { background: "#1c1a0a", border: "1px solid #854f0b", borderRadius: 8, padding: "10px 14px", color: "#fbbf24", fontSize: 12 },
  err:        { background: "#1a0a0a", border: "1px solid #7f1d1d", borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 12 },
  emptyState: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#1e2d4a", fontSize: 13, gap: 12, padding: 40 },
  pagRow:     { display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderTop: "1px solid #1e2d4a" },
  pageBtn:    { background: "#0a1628", border: "1px solid #1e2d4a", color: "#475569", borderRadius: 4, padding: "3px 10px", cursor: "pointer", fontSize: 12 },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseEquationMeta(eq) {
  if (!eq || !eq.includes("=")) return { variables: [], budget: null, autoCoeffs: {} };
  const [lhs, rhs] = eq.split("=");
  const budget = parseFloat(rhs?.trim());
  const variables = [], autoCoeffs = {};
  const seen = new Set();
  const re = /([+-]?\s*\d*\.?\d*)\s*([a-zA-Z]+)/g;
  let m;
  while ((m = re.exec(lhs)) !== null) {
    const v = m[2];
    let c = parseFloat(m[1].replace(/\s/g, ""));
    if (isNaN(c) || m[1].trim() === "" || m[1].trim() === "+") c = 1;
    if (m[1].trim() === "-") c = -1;
    if (!seen.has(v)) { seen.add(v); variables.push(v); autoCoeffs[v] = c; }
  }
  return { variables, budget: isNaN(budget) ? null : budget, autoCoeffs };
}

function computeAutoBounds(autoCoeffs, budget) {
  if (!budget || budget <= 0) return {};
  const b = {};
  Object.entries(autoCoeffs).forEach(([v, c]) => { if (c > 0) b[v] = Math.floor(budget / c); });
  return b;
}

function fmtMs(sec) { return sec == null ? "—" : `${(sec * 1000).toFixed(2)} ms`; }

// ── Example equations for quick-pick ─────────────────────────────────────────
const EXAMPLES = [
  { label: "Linear",      eq: "2x + 6 = 0" },
  { label: "Quadratic",   eq: "x^2 - 5x + 6 = 0" },
  
  { label: "Cubic",       eq: "x^3 - 6x^2 + 11x - 6 = 0" },
  { label: "Degree-4",    eq: "x^4 - 10x^2 + 9 = 0" },
  { label: "Multi-var",   eq: "10x + 20y + 5z = 500" },
];

// ── Solver Steps panel ────────────────────────────────────────────────────────
function SolverSteps({ steps }) {
  const [open, setOpen] = useState(true);
  if (!steps?.length) return null;
  return (
    <div style={{ background: "#060d1a", border: "1px solid #1e2d4a", borderRadius: 8, overflow: "hidden" }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 14px", cursor: "pointer", borderBottom: open ? "1px solid #0f1d33" : "none" }}
      >
        <span style={{ fontSize: 10, color: "#334155", letterSpacing: 1, textTransform: "uppercase", fontWeight: 700 }}>
          ⚙ Solver Process ({steps.length} steps)
        </span>
        <span style={{ color: "#334155", fontSize: 12 }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{ maxHeight: 200, overflowY: "auto", padding: "8px 14px", display: "flex", flexDirection: "column", gap: 2 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 8, padding: "2px 0" }}>
              <span style={{ color: "#10b981", fontSize: 10, flexShrink: 0 }}>▸</span>
              <span style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace" }}
                dangerouslySetInnerHTML={{
                  __html: s
                    .replace(/(\d[\d,.]*)/g, "<strong style='color:#94a3b8'>$1</strong>")
                    .replace(/(ms|O\([^)]+\)|∞)/g, "<strong style='color:#3b82f6'>$1</strong>")
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Algebraic Steps panel — full trace ───────────────────────────────────────
function AlgebraicSteps({ steps }) {
  const [open, setOpen] = useState(true);
  if (!steps?.length) return null;
  return (
    <div style={{ background: "#060d1a", border: "1px solid #1e2d4a", borderRadius: 8, overflow: "hidden" }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 14px", cursor: "pointer", borderBottom: open ? "1px solid #0f1d33" : "none" }}
      >
        <span style={{ fontSize: 10, color: "#10b981", letterSpacing: 1, textTransform: "uppercase", fontWeight: 700 }}>
          📐 Step-by-Step Solution Trace ({steps.length} steps)
        </span>
        <span style={{ color: "#334155", fontSize: 12 }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{ maxHeight: 360, overflowY: "auto", padding: "10px 14px" }}>
          {steps.map((s, i) => {
            const isHeader = s.startsWith("━━━") || s.startsWith("Step") || s.startsWith("✓");
            const isEmpty = s.trim() === "";
            return (
              <div key={i} style={{ padding: isEmpty ? "3px 0" : "2px 0 2px 0" }}>
                {isEmpty ? <div style={{ height: 6 }} /> : (
                  <div style={{
                    fontFamily: "monospace",
                    fontSize: isHeader ? 12 : 11,
                    color: s.startsWith("✓") ? "#10b981" : isHeader ? "#60a5fa" : "#94a3b8",
                    fontWeight: isHeader ? 700 : 400,
                    borderLeft: isHeader && !s.startsWith("━") ? "2px solid #1e3a5f" : "none",
                    paddingLeft: isHeader && !s.startsWith("━") ? 8 : 0,
                    letterSpacing: s.startsWith("━") ? 1 : 0,
                  }}>
                    {s}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Combinations / roots table ────────────────────────────────────────────────
function CombinationsTable({ algebraicResult }) {
  if (!algebraicResult) return null;
  const { combinations, degree, equation_type, root_count, real_root_count, has_complex, discriminant, coefficients } = algebraicResult;

  return (
    <div style={{ background: "#060d1a", border: "1px solid #1e2d4a", borderRadius: 8, overflow: "hidden" }}>
      {/* Header bar */}
      <div style={{ padding: "9px 14px", borderBottom: "1px solid #0f1d33", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: 10, color: "#334155", letterSpacing: 1, textTransform: "uppercase", fontWeight: 700 }}>
          🔢 Roots &amp; Combinations
        </span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, background: "#1e3a5f", color: "#60a5fa", padding: "2px 8px", borderRadius: 4 }}>
            {equation_type}  ·  degree {degree}
          </span>
          <span style={{ fontSize: 10, background: "#052e16", color: "#10b981", padding: "2px 8px", borderRadius: 4 }}>
            {real_root_count}/{root_count} real
          </span>
          {has_complex && (
            <span style={{ fontSize: 10, background: "#1c0a2e", color: "#c084fc", padding: "2px 8px", borderRadius: 4 }}>
              complex roots
            </span>
          )}
        </div>
      </div>

      {/* Coefficient info */}
      {coefficients && Object.keys(coefficients).length > 0 && (
        <div style={{ padding: "8px 14px", borderBottom: "1px solid #0f1d33", display: "flex", gap: 10, flexWrap: "wrap" }}>
          {Object.entries(coefficients).map(([k, v]) => (
            <span key={k} style={{ fontSize: 11, fontFamily: "monospace", color: "#64748b" }}>
              <span style={{ color: "#475569" }}>{k}</span> = <span style={{ color: "#94a3b8" }}>{Number(v).toPrecision(5).replace(/\.?0+$/, "")}</span>
            </span>
          ))}
          {discriminant != null && (
            <span style={{ fontSize: 11, fontFamily: "monospace" }}>
              <span style={{ color: "#475569" }}>Δ</span> = <span style={{ color: discriminant > 0 ? "#10b981" : discriminant < 0 ? "#f87171" : "#f59e0b" }}>{Number(discriminant).toPrecision(5).replace(/\.?0+$/, "")}</span>
              <span style={{ color: "#334155", fontSize: 10 }}> {discriminant > 0 ? "(2 real)" : discriminant < 0 ? "(complex)" : "(double root)"}</span>
            </span>
          )}
        </div>
      )}

      {/* Roots table */}
      <div style={S.tableWrap}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={S.th}>Root</th>
              <th style={S.th}>Value</th>
              <th style={S.th}>Type</th>
              <th style={S.th}>Verify f(x)</th>
            </tr>
          </thead>
          <tbody>
            {(combinations || []).map((combo, i) => {
              const isComplex = !combo.is_real;
              const fval = combo.is_real && !isNaN(combo.float)
                ? Number(combo.float).toFixed(8)
                : "—";
              return (
                <tr key={i} style={{ background: i % 2 ? "#060d1a" : "transparent" }}>
                  <td style={{ ...S.td, color: "#60a5fa", fontWeight: 700 }}>{combo.label}</td>
                  <td style={{ ...S.td, color: isComplex ? "#c084fc" : "#10b981", fontWeight: isComplex ? 400 : 600 }}>
                    {combo.value}
                  </td>
                  <td style={{ ...S.td }}>
                    <span style={{
                      fontSize: 10, padding: "1px 7px", borderRadius: 3,
                      background: isComplex ? "rgba(192,132,252,0.12)" : "rgba(16,185,129,0.12)",
                      color: isComplex ? "#c084fc" : "#10b981",
                    }}>
                      {isComplex ? "Complex" : "Real"}
                    </span>
                  </td>
                  <td style={{ ...S.td, color: "#334155", fontSize: 11 }}>
                    {combo.is_real && !isNaN(combo.float) ? "≈ 0 ✓" : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary footer */}
      <div style={{ padding: "8px 14px", borderTop: "1px solid #0f1d33", display: "flex", gap: 20 }}>
        <div>
          <div style={{ fontSize: 10, color: "#334155", letterSpacing: 1 }}>TOTAL ROOTS</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#3b82f6", fontFamily: "monospace" }}>{root_count}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "#334155", letterSpacing: 1 }}>REAL ROOTS</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#10b981", fontFamily: "monospace" }}>{real_root_count}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "#334155", letterSpacing: 1 }}>COMPLEX</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#c084fc", fontFamily: "monospace" }}>{root_count - real_root_count}</div>
        </div>
      </div>
    </div>
  );
}

// ── Root summary cards ────────────────────────────────────────────────────────
function RootCards({ algebraicResult }) {
  if (!algebraicResult?.roots?.length) return null;
  const { roots, equation_type } = algebraicResult;
  return (
    <div style={{ background: "linear-gradient(135deg,#0d1f3c,#0a1628,#071020)", border: "1px solid rgba(59,130,246,0.4)", borderRadius: 12, padding: "18px 20px", boxShadow: "0 0 30px rgba(59,130,246,0.15)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 18 }}>🎯</span>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "2px", color: "#60a5fa", textTransform: "uppercase" }}>
          {equation_type} — Solutions
        </span>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {roots.map((r, i) => (
          <div key={i} style={{
            flex: "1 1 120px", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)",
            borderRadius: 8, padding: "12px 14px", textAlign: "center",
          }}>
            <div style={{ fontSize: 10, color: "#64748b", marginBottom: 6, letterSpacing: 1 }}>
              ROOT {i + 1}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: r.includes("i") ? "#c084fc" : "#93c5fd", fontFamily: "monospace", wordBreak: "break-all" }}>
              {r.replace(/^x[₀-₉\d]+ = /, "").replace("(real)", "").replace("(double root)", "").trim()}
            </div>
            {r.includes("double") && <div style={{ fontSize: 9, color: "#f59e0b", marginTop: 4 }}>double root</div>}
            {r.includes("triple") && <div style={{ fontSize: 9, color: "#f59e0b", marginTop: 4 }}>triple root</div>}
            {r.includes("i") && <div style={{ fontSize: 9, color: "#c084fc", marginTop: 4 }}>complex</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [equation,    setEquation]    = useState("x^2 - 5x + 6 = 0");
  const [userBounds,  setUserBounds]  = useState({});
  const [constraints, setConstraints] = useState([]);
  const [result,      setResult]      = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [sortKey,     setSortKey]     = useState(null);
  const [sortDir,     setSortDir]     = useState("asc");
  const [investMode,  setInvestMode]  = useState(false);
  const [page,        setPage]        = useState(0);

  const { variables, budget, autoCoeffs } = useMemo(() => parseEquationMeta(equation), [equation]);
  const autoBounds = useMemo(() => computeAutoBounds(autoCoeffs, budget), [autoCoeffs, budget]);

  const displayBounds = useMemo(() => {
    const base = result?.auto_bounds && Object.keys(result.auto_bounds).length > 0 ? result.auto_bounds : autoBounds;
    return { ...base, ...Object.fromEntries(Object.entries(userBounds).filter(([, v]) => v !== "")) };
  }, [result, autoBounds, userBounds]);

  const algebraic = result?.algebraic_roots;
  const isAlgebraic = !!algebraic;

  const handleSolve = useCallback(async () => {
    if (loading || !equation.trim()) return;
    setLoading(true);
    setResult(null);
    setPage(0);
    const boundsPayload = {};
    Object.entries(userBounds).forEach(([v, val]) => {
      if (val !== "" && val !== null && !isNaN(Number(val))) boundsPayload[v] = Number(val);
    });
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equation,
          bounds: boundsPayload,
          constraints: constraints.map(c => ({
            var: c.var, op: c.op,
            val: ["even","odd"].includes(c.op) ? null : Number(c.val),
          })),
        }),
      });
      setResult(await res.json());
    } catch {
      setResult({ error: "Could not connect to engine. Is the Go server running on port 5000?" });
    }
    setLoading(false);
  }, [equation, userBounds, constraints]);

  const sorted = useMemo(() => {
    if (!result?.solutions) return [];
    if (!sortKey) return result.solutions;
    return [...result.solutions].sort((a, b) =>
      sortDir === "asc" ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey]
    );
  }, [result, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const pageData   = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const toggleSort = key => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const bestSol = result?.best_solution?.best_solution;

  return (
    <div style={S.dash}>
      {/* Topbar */}
      <div style={S.topbar}>
        <div style={S.logo}>
          <span style={S.logoSpan}>◆</span> QUANT<span style={S.logoSpan}>SOLVE</span>
        </div>
        <span style={S.sub}>EQUATION ENGINE v3.0</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {EXAMPLES.map(ex => (
            <button key={ex.label}
              onClick={() => { setEquation(ex.eq); setResult(null); setUserBounds({}); setConstraints([]); }}
              style={{ background: equation === ex.eq ? "#1e3a5f" : "transparent", border: "1px solid #1e2d4a", color: equation === ex.eq ? "#60a5fa" : "#475569", borderRadius: 4, padding: "3px 9px", fontSize: 10, cursor: "pointer", letterSpacing: 0.5 }}>
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      <div style={S.main}>
        {/* ══ LEFT PANEL ══ */}
        <aside style={S.leftPanel}>
          <div>
            <div style={S.label}>Equation</div>
            <input
              style={S.eqInput}
              value={equation}
              onChange={e => { setEquation(e.target.value); setResult(null); setUserBounds({}); }}
              onKeyDown={e => e.key === "Enter" && handleSolve()}
              placeholder="e.g. x^2 - 5x + 6 = 0"
              spellCheck={false}
            />
            {variables.length > 0 && budget !== null && (
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, color: "#334155" }}>Parsed:</span>
                {variables.map(v => (
                  <span key={v} style={{ background: "#1e3a5f", color: "#60a5fa", fontSize: 10, padding: "1px 6px", borderRadius: 3, fontFamily: "monospace" }}>{v}</span>
                ))}
                <span style={{ background: "#052e16", color: "#10b981", fontSize: 10, padding: "1px 7px", borderRadius: 3, fontFamily: "monospace" }}>
                  rhs={budget.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Market limits — only useful for multi-var integer solver */}
          {!isAlgebraic && variables.length > 0 && (
            <div>
              <div style={S.label}>Market Limits</div>
              <div style={S.section}>
                {variables.map((v, i) => {
                  const autoVal = autoBounds[v];
                  const resultVal = result?.auto_bounds?.[v];
                  return (
                    <div key={v} style={{ ...S.varRow, borderBottom: i < variables.length - 1 ? "1px solid #0f1d33" : "none", paddingBottom: 5 }}>
                      <span style={S.varBadge}>{v}</span>
                      <span style={{ fontSize: 10, color: "#334155", flex: 1 }}>
                        auto ≤ <span style={{ color: "#60a5fa" }}>{resultVal ?? autoVal ?? "—"}</span>
                      </span>
                      <input style={S.smallIn} type="number" min={1}
                        placeholder={String(resultVal ?? autoVal ?? "")}
                        value={userBounds[v] ?? ""}
                        onChange={e => setUserBounds(p => ({ ...p, [v]: e.target.value }))} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Constraints (multi-var only) */}
          {!isAlgebraic && (
            <div>
              <div style={S.label}>Constraints</div>
              <div style={S.section}>
                {constraints.length === 0 && <div style={{ fontSize: 11, color: "#1e2d4a", textAlign: "center", padding: "6px 0" }}>No constraints</div>}
                {constraints.map((c, i) => (
                  <div key={i} style={{ ...S.varRow, marginBottom: 4 }}>
                    <select style={S.opSel} value={c.var} onChange={e => { const u = [...constraints]; u[i] = { ...u[i], var: e.target.value }; setConstraints(u); }}>
                      {variables.map(v => <option key={v}>{v}</option>)}
                    </select>
                    <select style={S.opSel} value={c.op} onChange={e => { const u = [...constraints]; u[i] = { ...u[i], op: e.target.value }; setConstraints(u); }}>
                      {[">","<",">=","<=","=","!=","even","odd"].map(op => <option key={op}>{op}</option>)}
                    </select>
                    {!["even","odd"].includes(c.op) && (
                      <input style={{ ...S.smallIn, width: 44 }} type="number" value={c.val}
                        onChange={e => { const u = [...constraints]; u[i] = { ...u[i], val: e.target.value }; setConstraints(u); }} />
                    )}
                    <button onClick={() => setConstraints(constraints.filter((_, j) => j !== i))}
                      style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 14, padding: "0 4px" }}>×</button>
                  </div>
                ))}
                <button style={S.addBtn} onClick={() => {
                  if (!variables.length) return;
                  setConstraints([...constraints, { var: variables[0], op: ">", val: "0" }]);
                }}>+ add constraint</button>
              </div>
            </div>
          )}

          <button
            style={{ ...S.solveBtn, opacity: loading || !equation.trim() ? 0.6 : 1 }}
            onClick={handleSolve}
            disabled={loading || !equation.trim()}
          >
            {loading ? "SOLVING…" : "▶ SOLVE EQUATION"}
          </button>
        </aside>

        {/* ══ CENTER PANEL ══ */}
        <main style={S.center}>

          {/* ── Stats bar ── */}
          {result && !result.error && (
            <>
              <div style={S.stats}>
                {(
  isAlgebraic
    ? [
        { val: algebraic.real_root_count, label: "Real Roots", color: "#10b981" },
        { val: algebraic.root_count, label: "Total Roots", color: "#3b82f6" },
        { val: algebraic.degree, label: "Degree", color: "#f59e0b" },
        {
          val:
            typeof algebraic.equation_type === "object"
              ? algebraic.equation_type.label
              : algebraic.equation_type,
          label: "Type",
          color: "#a78bfa",
        },
      ]
    : [
        { val: result.count != null ? result.count + (result.capped ? "+" : "") : "—", label: "Solutions", color: "#10b981" },
        { val: result.variables?.length ?? variables.length, label: "Variables", color: "#3b82f6" },
        { val: result.equation?.split("=")[1]?.trim() ?? budget ?? "—", label: "Budget", color: "#f59e0b" },
        { val: result.capped ? "CAPPED" : result.count === 0 ? "NONE" : "COMPLETE", label: "Status", color: result.capped ? "#f59e0b" : result.count === 0 ? "#ef4444" : "#10b981" },
      ]
).map((s, i) => (
  <div key={i} style={S.stat}>
    <div
      style={{
        ...S.statN,
        color: s.color,
        fontSize:
          typeof s.val === "string" && s.val.length > 6 ? 13 : 20,
      }}
    >
      {typeof s.val === "object"
        ? s.val.label || JSON.stringify(s.val)
        : s.val}
    </div>
    <div style={S.statL}>{s.label}</div>
  </div>
))}
              </div>
              <div style={S.stats}>
                {[
                  { val: fmtMs(result.execution_time),              label: "Exec Time",   color: "#a78bfa" },
                  { val: result.iterations?.toLocaleString() ?? "—", label: "Iterations",  color: "#2dd4bf" },
                  { val: result.pruned_count?.toLocaleString() ?? "—",label: "Pruned",    color: "#f59e0b" },
                  { val: result.complexity ?? "—",                   label: "Complexity",  color: "#3b82f6" },
                ].map((s, i) => (
                  <div key={i} style={S.stat}>
                    <div style={{ ...S.statN, fontSize: 14, color: s.color }}>{typeof s.val === "object"
  ? (s.val.label || JSON.stringify(s.val))
  : s.val}</div>
                    <div style={S.statL}>{s.label}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Messages */}
          {result?.warning && <div style={S.warn}>⚠ {result.warning}</div>}
          {result?.error   && <div style={S.err}>✕ {result.error}</div>}

          {/* ── Solver process steps ── */}
          {result?.solver_steps?.length > 0 && <SolverSteps steps={result.solver_steps} />}

          {/* ── ALGEBRAIC PATH ── */}
          {isAlgebraic && (
            <>
              {/* Root cards */}
              <RootCards algebraicResult={algebraic} />

              {/* Full step-by-step trace */}
              <AlgebraicSteps steps={algebraic.solve_steps} />

              {/* Roots + Combinations table */}
              <CombinationsTable algebraicResult={algebraic} />
            </>
          )}

          {/* ── INTEGER PATH ── */}
          {!isAlgebraic && (
            <>
              {result?.best_solution && (
                <BestSolutionCard bestData={result.best_solution} variables={result.variables} investmentMode={investMode} />
              )}
              {sorted.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", flex: 1, background: "#060d1a", border: "1px solid #1e2d4a", borderRadius: 8, overflow: "hidden" }}>
                  <div style={{ padding: "8px 14px", borderBottom: "1px solid #1e2d4a", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 10, color: "#334155", letterSpacing: 1, textTransform: "uppercase" }}>Solutions Table</span>
                    <span style={{ fontSize: 10, fontFamily: "monospace", color: "#10b981" }}>{sorted.length} rows</span>
                  </div>
                  <div style={S.tableWrap}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={S.th}>#</th>
                          {result.variables.map(v => (
                            <th key={v} style={S.th} onClick={() => toggleSort(v)}>
                              {v} {sortKey === v ? (sortDir === "asc" ? "▲" : "▼") : ""}
                            </th>
                          ))}
                          <th style={S.th}>STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageData.map((sol, i) => {
                          const globalIdx = page * PAGE_SIZE + i;
                          const isBest = bestSol && result.variables.every(v => sol[v] === bestSol[v]);
                          return (
                            <tr key={i} style={{ background: isBest ? "linear-gradient(90deg,rgba(59,130,246,0.12),rgba(59,130,246,0.04))" : i % 2 ? "#060d1a" : "transparent" }}>
                              <td style={{ ...S.td, color: "#334155" }}>{globalIdx + 1}</td>
                              {result.variables.map(v => (
                                <td key={v} style={{ ...S.td, color: sol[v] === 0 ? "#1e2d4a" : isBest ? "#93c5fd" : "#94a3b8" }}>{sol[v]}</td>
                              ))}
                             {result.variables.map(v => {
  const cell = sol[v];
  return (
    <td key={v} style={{ ...S.td }}>
      {typeof cell === "object"
        ? `${cell.label}: ${cell.val}`
        : cell}
    </td>
  );
})}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {totalPages > 1 && (
                    <div style={S.pagRow}>
                      <button style={S.pageBtn} onClick={() => setPage(0)} disabled={page === 0}>«</button>
                      <button style={S.pageBtn} onClick={() => setPage(p => p - 1)} disabled={page === 0}>‹</button>
                      <span style={{ fontSize: 11, color: "#475569", flex: 1, textAlign: "center" }}>{page + 1} / {totalPages}</span>
                      <button style={S.pageBtn} onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>›</button>
                      <button style={S.pageBtn} onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}>»</button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Empty / loading states */}
          {!result && !loading && (
            <div style={S.emptyState}>
              <div style={{ fontSize: 48, opacity: 0.15 }}>⬡</div>
              <div>Pick an example above or enter any equation and press <strong>SOLVE</strong></div>
              <div style={{ fontSize: 11, color: "#1e3a5f" }}>Supports linear · quadratic · cubic · polynomial · multi-variable</div>
            </div>
          )}
          {loading && (
            <div style={S.emptyState}>
              <div style={{ width: 32, height: 32, border: "3px solid #1e2d4a", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <div>Solving…</div>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}
        </main>

        {/* ══ RIGHT PANEL ══ */}
        <aside style={S.rightPanel}>

          {/* ── Algebraic path: polynomial curve chart ── */}
          {isAlgebraic && (
            <PolynomialChart algebraicResult={algebraic} />
          )}

          {/* ── Integer path: investment + bar/pie charts ── */}
          {!isAlgebraic && (
            <>
              {investMode && bestSol && result?.variables ? (
                <InvestmentSummary solution={bestSol} variables={result.variables} coefficients={autoCoeffs} />
              ) : (
                <div style={{ ...S.section, textAlign: "center" }}>
                  <div style={{ fontSize: 22, marginBottom: 8 }}>💰</div>
                  <div style={{ fontSize: 11, color: "#334155", marginBottom: 8 }}>Investment Mode</div>
                  <button style={{ ...S.addBtn, marginTop: 4, color: "#3b82f6", borderColor: "#1e3a5f" }}
                    onClick={() => setInvestMode(true)}>Enable →</button>
                </div>
              )}
              {sorted.length > 0 ? (
                <SolutionChart solutions={result.solutions} variables={result.variables} bestSolution={bestSol} />
              ) : (
                <div style={{ ...S.section, textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📊</div>
                  <div style={{ fontSize: 11, color: "#334155" }}>Charts appear after solving</div>
                </div>
              )}
            </>
          )}

          {/* ── Auto-bounds display (integer path) ── */}
          {!isAlgebraic && result?.auto_bounds && Object.keys(result.auto_bounds).length > 0 && (
            <div style={S.section}>
              <div style={S.label}>Auto Bounds</div>
              {Object.entries(result.auto_bounds).map(([v, max]) => (
                <div key={v} style={{ ...S.varRow, justifyContent: "space-between" }}>
                  <span style={S.varBadge}>{v}</span>
                  <div style={{ flex: 1, margin: "0 8px", height: 4, background: "#0f1d33", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(100, (userBounds[v] || max) / max * 100)}%`, background: "linear-gradient(90deg,#1d4ed8,#3b82f6)", borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 11, fontFamily: "monospace", color: "#60a5fa" }}>≤{max}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Algebraic path: discriminant / method info ── */}
          {isAlgebraic && algebraic.discriminant != null && (
            <div style={S.section}>
              <div style={S.label}>Discriminant Analysis</div>
              <div style={{ fontFamily: "monospace", fontSize: 13, color: "#e2e8f0", marginBottom: 8 }}>
                Δ = <span style={{ color: algebraic.discriminant > 0 ? "#10b981" : algebraic.discriminant < 0 ? "#f87171" : "#f59e0b", fontWeight: 700 }}>
                  {Number(algebraic.discriminant).toPrecision(6)}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "#64748b" }}>
                {algebraic.discriminant > 0 && "Δ > 0 → Two distinct real roots"}
                {algebraic.discriminant < 0 && "Δ < 0 → Two complex conjugate roots (no real solution)"}
                {algebraic.discriminant === 0 && "Δ = 0 → One repeated (double) root"}
              </div>
            </div>
          )}

          {isAlgebraic && (
            <div style={S.section}>
              <div style={S.label}>Solver Info</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { label: "Method",    val: algebraic.solver_used },
                  { label: "Type",      val: algebraic.equation_type },
                  { label: "Degree",    val: algebraic.degree },
                  { label: "Real roots",val: `${algebraic.real_root_count} / ${algebraic.root_count}` },
                  { label: "Complex",   val: algebraic.has_complex ? "Yes" : "No" },
                  { label: "Graph pts", val: algebraic.graph_points?.length ?? 0 },
                ].map((row, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, borderBottom: "1px solid #0f1d33", paddingBottom: 4 }}>
                    <span style={{ color: "#475569" }}>{row.label}</span>
                    <span style={{ color: "#94a3b8", fontFamily: "monospace" }}>{row.val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </aside>
      </div>
    </div>
  );
}
