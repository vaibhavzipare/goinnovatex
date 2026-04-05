// InvestmentSummary.jsx — 💰 Investment Mode
// Prices come from equation coefficients (e.g. 10x+20y+5z=500 → prices are 10, 20, 5)

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];
const ICONS  = ["📈", "📊", "💹", "📉", "🏦"];

export default function InvestmentSummary({ solution, variables, coefficients }) {
  if (!solution || !variables || !coefficients) return null;

  const items = variables.map((v, i) => ({
    variable: v,
    price:    coefficients[v] || 1,
    units:    solution[v] || 0,
    color:    COLORS[i % COLORS.length],
    icon:     ICONS[i % ICONS.length],
    total:    (solution[v] || 0) * (coefficients[v] || 1),
  }));

  const grandTotal = items.reduce((s, it) => s + it.total, 0);

  return (
    <div style={{ background: "#060d1a", border: "1px solid #1e2d4a", borderRadius: 12, padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 16 }}>💰</span>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "2px", color: "#10b981", textTransform: "uppercase" }}>
          Investment Summary
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {items.map((it, i) => {
          const pct = grandTotal > 0 ? (it.total / grandTotal) * 100 : 0;
          return (
            <div key={i} style={{ background: "#0a1628", border: "1px solid #1e2d4a", borderRadius: 8, padding: "10px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14 }}>{it.icon}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: it.color }}>{it.variable.toUpperCase()}</div>
                    <div style={{ fontSize: 10, color: "#475569" }}>
                      ₹{it.price} × {it.units} units
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", fontFamily: "monospace" }}>
                    ₹{it.total.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 10, color: "#64748b" }}>{pct.toFixed(1)}%</div>
                </div>
              </div>
              <div style={{ height: 3, background: "#0f1d33", borderRadius: 2, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${pct}%`,
                  background: `linear-gradient(90deg, ${it.color}88, ${it.color})`,
                  borderRadius: 2, transition: "width 0.6s ease",
                }} />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        background: "linear-gradient(135deg, #052e16, #0a1628)",
        border: "1px solid rgba(16,185,129,0.3)",
        borderRadius: 8, padding: "12px 16px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ fontSize: 10, color: "#64748b", letterSpacing: 1, marginBottom: 2 }}>TOTAL</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#10b981", fontFamily: "monospace" }}>
            ₹{grandTotal.toLocaleString()}
          </div>
        </div>
        <div style={{ fontSize: 28 }}>🎯</div>
      </div>
    </div>
  );
}
