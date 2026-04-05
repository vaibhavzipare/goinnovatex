// SolutionChart.jsx — unified chart for integer solutions AND polynomial curves

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
  LineChart, Line, ReferenceLine, Scatter, ScatterChart,
} from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];

const TIP = {
  background: "#0d1526", border: "1px solid #1e2d4a", borderRadius: 8,
  padding: "8px 12px", fontSize: 12, color: "#e2e8f0",
};

function BarTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={TIP}>
      <div style={{ color: "#60a5fa", fontWeight: 600, marginBottom: 4 }}>Solution #{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>{p.dataKey.toUpperCase()}: <strong>{p.value}</strong></div>
      ))}
    </div>
  );
}

function PieTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const e = payload[0];
  return (
    <div style={TIP}>
      <div style={{ color: e.payload.fill, fontWeight: 600 }}>{e.name.toUpperCase()}</div>
      <div style={{ color: "#94a3b8" }}>Value: <strong style={{ color: "#e2e8f0" }}>{e.value}</strong></div>
      <div style={{ color: "#94a3b8" }}>Share: <strong style={{ color: "#e2e8f0" }}>{e.payload.pct}%</strong></div>
    </div>
  );
}

function LineTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const x = payload[0]?.payload?.x;
  const y = payload[0]?.payload?.y;
  if (x == null) return null;
  return (
    <div style={TIP}>
      <div style={{ color: "#60a5fa" }}>x = <strong>{x}</strong></div>
      <div style={{ color: "#10b981" }}>f(x) = <strong>{y}</strong></div>
    </div>
  );
}

// ── Polynomial curve chart ────────────────────────────────────────────────────
export function PolynomialChart({ algebraicResult }) {
  if (!algebraicResult) return null;
  const { graph_points, root_values, roots, equation_type, degree, real_root_count } = algebraicResult;

  if (!graph_points?.length) return (
    <div style={{ color: "#334155", fontSize: 12, textAlign: "center", padding: 20 }}>
      No graph data available
    </div>
  );

  const realRoots = (root_values || []).filter(v => !isNaN(v));

  // Y-axis limits: clip extremes so the curve is readable
  const ys = graph_points.map(p => p.y).filter(v => isFinite(v) && !isNaN(v));
  const yMax = Math.min(Math.max(...ys) * 1.15, 1e6);
  const yMin = Math.max(Math.min(...ys) * 1.15, -1e6);

  return (
    <div style={{ background: "#060d1a", border: "1px solid #1e2d4a", borderRadius: 12, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>📈</span>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "2px", color: "#f59e0b", textTransform: "uppercase" }}>
            Curve Graph — f(x) = 0
          </span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <span style={{ fontSize: 10, background: "#1e3a5f", color: "#60a5fa", padding: "2px 8px", borderRadius: 4 }}>
            {equation_type}
          </span>
          <span style={{ fontSize: 10, background: "#052e16", color: "#10b981", padding: "2px 8px", borderRadius: 4 }}>
            {real_root_count} real root{real_root_count !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Root markers legend */}
      {realRoots.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {realRoots.map((r, i) => (
            <span key={i} style={{ fontSize: 11, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", color: "#f87171", padding: "2px 8px", borderRadius: 4, fontFamily: "monospace" }}>
              {roots[i]?.replace("(real)", "").trim()}
            </span>
          ))}
        </div>
      )}

      {/* Line chart */}
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={graph_points} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#0f1d33" />
          <XAxis dataKey="x" tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false}
            tickFormatter={v => Number(v).toFixed(1)} interval="preserveStartEnd" />
          <YAxis domain={[yMin, yMax]} tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false}
            tickFormatter={v => Number(v).toFixed(1)} />
          <Tooltip content={<LineTip />} />
          {/* y = 0 baseline */}
          <ReferenceLine y={0} stroke="#334155" strokeWidth={1.5} strokeDasharray="4 2" />
          {/* Mark real roots on x-axis */}
          {realRoots.map((r, i) => (
            <ReferenceLine key={i} x={r} stroke="#ef4444" strokeWidth={1.5}
              strokeDasharray="3 2" label={{ value: `x${i+1}`, fill: "#f87171", fontSize: 9, position: "top" }} />
          ))}
          <Line type="monotone" dataKey="y" stroke="#3b82f6" dot={false} strokeWidth={2.5}
            activeDot={{ r: 4, fill: "#60a5fa" }} />
        </LineChart>
      </ResponsiveContainer>

      {/* Axis legend */}
      <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 20, height: 2, background: "#3b82f6" }} />
          <span style={{ fontSize: 10, color: "#64748b" }}>f(x)</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 20, height: 2, background: "#334155", borderTop: "2px dashed #334155" }} />
          <span style={{ fontSize: 10, color: "#64748b" }}>y = 0</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 2, height: 12, background: "#ef4444" }} />
          <span style={{ fontSize: 10, color: "#64748b" }}>root</span>
        </div>
      </div>
    </div>
  );
}

// ── Integer solutions chart (original) ───────────────────────────────────────
export default function SolutionChart({ solutions, variables, bestSolution }) {
  if (!solutions?.length || !variables?.length) return null;

  const barData = solutions.slice(0, 12).map((sol, i) => ({
    name: i + 1,
    ...Object.fromEntries(variables.map(v => [v, sol[v]])),
  }));

  const pieSource = bestSolution || solutions[0];
  const total = variables.reduce((s, v) => s + (pieSource[v] || 0), 0);
  const pieData = variables
    .filter(v => (pieSource[v] || 0) > 0)
    .map((v) => ({
      name: v, value: pieSource[v],
      pct: total > 0 ? ((pieSource[v] / total) * 100).toFixed(1) : "0",
    }));

  return (
    <div style={{ background: "#060d1a", border: "1px solid #1e2d4a", borderRadius: 12, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 16 }}>📊</span>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "2px", color: "#f59e0b", textTransform: "uppercase" }}>
          Graph Visualization
        </span>
      </div>
      <div>
        <div style={{ fontSize: 11, color: "#475569", marginBottom: 10, letterSpacing: 1 }}>
          VARIABLE VALUES — FIRST {barData.length} SOLUTIONS
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={barData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barGap={2} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" stroke="#0f1d33" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<BarTip />} cursor={{ fill: "rgba(59,130,246,0.05)" }} />
            <Legend wrapperStyle={{ fontSize: 10, color: "#64748b", paddingTop: 8 }} formatter={v => v.toUpperCase()} />
            {variables.map((v, i) => (
              <Bar key={v} dataKey={v} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} maxBarSize={28} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      {pieData.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: "#475569", marginBottom: 10, letterSpacing: 1 }}>
            BEST SOLUTION — DISTRIBUTION
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <ResponsiveContainer width="55%" height={140}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={62} paddingAngle={3} dataKey="value" strokeWidth={0}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<PieTip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              {pieData.map((entry, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>{entry.name.toUpperCase()}</span>
                  <span style={{ fontSize: 11, color: COLORS[i % COLORS.length], marginLeft: "auto", fontWeight: 600 }}>{entry.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
