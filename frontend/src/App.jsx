// App.jsx — QUANTSOLVE v2
// Place this in: frontend/src/App.jsx
// Hash routing: default = Landing page, #dashboard = Dashboard

import { useState, useEffect } from "react";
import LandingPage from "./LandingPage";
import Dashboard   from "./Dashboard";
import "./App.css";

export default function App() {
  // Default is always "landing" — only go to dashboard if hash says so
  const [page, setPage] = useState(() => {
    if (typeof window !== "undefined" && window.location.hash === "#dashboard") {
      return "dashboard";
    }
    return "landing";   // ← always start on landing
  });

  useEffect(() => {
    // Listen for back/forward navigation
    const handler = () => {
      setPage(window.location.hash === "#dashboard" ? "dashboard" : "landing");
    };
    window.addEventListener("hashchange", handler);

    // On mount: if hash is empty or not #dashboard, force landing
    if (window.location.hash !== "#dashboard") {
      window.location.hash = "";   // clear any stale hash
      setPage("landing");
    }

    return () => window.removeEventListener("hashchange", handler);
  }, []);

  const goToDashboard = () => {
    window.location.hash = "#dashboard";
    setPage("dashboard");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToLanding = () => {
    window.location.hash = "";
    setPage("landing");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (page === "dashboard") {
    return (
      <div>
        {/* Back to landing — appears in top-left corner of dashboard */}
        <button
          onClick={goToLanding}
          style={{
            position: "fixed", top: 12, left: 12, zIndex: 9999,
            fontFamily: "'Space Mono', monospace", fontSize: "0.58rem",
            color: "rgba(123,138,184,0.7)", letterSpacing: "0.08em",
            cursor: "pointer", background: "rgba(3,6,15,0.9)",
            padding: "5px 12px", borderRadius: 6,
            border: "1px solid rgba(80,120,220,0.18)",
            transition: "all 0.2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = "#e8eaf6"; e.currentTarget.style.borderColor = "rgba(108,99,255,0.4)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "rgba(123,138,184,0.7)"; e.currentTarget.style.borderColor = "rgba(80,120,220,0.18)"; }}
        >
          ← Home
        </button>
        <Dashboard />
      </div>
    );
  }

  // Default: Landing page
  return <LandingPage onLaunch={goToDashboard} />;
}
