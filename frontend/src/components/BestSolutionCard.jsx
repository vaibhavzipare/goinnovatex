// BestSolutionCard.jsx — ⭐ AI-ranked best solution with glow styling

export default function BestSolutionCard({ bestData, variables, investmentMode, stockPrices }) {
  if (!bestData) return null;

  const { best_solution, reason } = bestData;
  const vars = variables || Object.keys(best_solution);

  const STOCK_NAMES = ["Stock A", "Stock B", "Stock C", "Stock D", "Stock E"];
  const STOCK_PRICES = stockPrices || [10, 20, 5, 15, 8];

  return (
    <div style={{
      background: "linear-gradient(135deg, #0d1f3c 0%, #0a1628 50%, #071020 100%)",
      border: "1px solid rgba(59,130,246,0.4)",
      borderRadius: 12,
      padding: "18px 20px",
      position: "relative",
      overflow: "hidden",
      boxShadow: "0 0 30px rgba(59,130,246,0.15), 0 0 60px rgba(59,130,246,0.06)",
      animation: "glowPulse 3s ease-in-out infinite",
    }}>
      {/* Glow orb */}
      <div style={{
        position: "absolute", top: -40, right: -40,
        width: 120, height: 120,
        background: "radial-gradient(circle, rgba(59,130,246,0.25) 0%, transparent 70%)",
        borderRadius: "50%", pointerEvents: "none",
      }} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 18 }}>⭐</span>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: "2px",
          color: "#60a5fa", textTransform: "uppercase",
        }}>Best Combination</span>
        <div style={{
          marginLeft: "auto",
          background: "rgba(59,130,246,0.15)",
          border: "1px solid rgba(59,130,246,0.3)",
          borderRadius: 20, padding: "2px 10px",
          fontSize: 10, color: "#93c5fd", fontWeight: 600,
        }}>OPTIMAL</div>
      </div>

      {/* Values */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {vars.map((v, i) => {
          const val = best_solution[v];
          const label = investmentMode ? STOCK_NAMES[i] || v.toUpperCase() : v.toUpperCase();
          const price = STOCK_PRICES[i] || 1;
          return (
            <div key={v} style={{
              flex: "1 1 80px",
              background: "rgba(59,130,246,0.1)",
              border: "1px solid rgba(59,130,246,0.25)",
              borderRadius: 8, padding: "10px 12px", textAlign: "center",
            }}>
              <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4, letterSpacing: 1 }}>
                {label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#93c5fd", fontFamily: "monospace" }}>
                {val}
              </div>
              {investmentMode && (
                <div style={{ fontSize: 10, color: "#3b82f6", marginTop: 2 }}>
                  ₹{(val * price).toLocaleString()}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Reason */}
      <div style={{
        background: "rgba(16,185,129,0.08)",
        border: "1px solid rgba(16,185,129,0.2)",
        borderRadius: 6, padding: "8px 12px",
        fontSize: 12, color: "#6ee7b7",
        display: "flex", alignItems: "flex-start", gap: 8,
      }}>
        <span style={{ fontSize: 14, flexShrink: 0 }}>💡</span>
        <span>{reason}</span>
      </div>

      <style>{`
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 30px rgba(59,130,246,0.15), 0 0 60px rgba(59,130,246,0.06); }
          50% { box-shadow: 0 0 40px rgba(59,130,246,0.25), 0 0 80px rgba(59,130,246,0.12); }
        }
      `}</style>
    </div>
  );
}
