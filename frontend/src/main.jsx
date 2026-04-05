// main.jsx — QUANTSOLVE v2
// Place this in: frontend/src/main.jsx
// IMPORTANT: renders <App /> not <Dashboard /> directly

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
