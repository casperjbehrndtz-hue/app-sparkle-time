import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Migrate old "kassen_*" localStorage keys → "nb_*" (one-time, idempotent)
try {
  const migrations: [string, string][] = [
    ["kassen_profile_v2", "nb_profile_v2"],
    ["kassen_lang", "nb_lang"],
    ["kassen_theme", "nb_theme"],
    ["kassen_cookie_consent", "nb_cookie_consent"],
    ["kassen_snapshots", "nb_snapshots"],
    ["kassen_market_data_v2", "nb_market_data_v2"],
    ["kassen_ai_usage", "nb_ai_usage"],
    ["kassen-budget", "nb-budget"],
  ];
  for (const [oldKey, newKey] of migrations) {
    const val = localStorage.getItem(oldKey);
    if (val !== null && localStorage.getItem(newKey) === null) {
      localStorage.setItem(newKey, val);
      localStorage.removeItem(oldKey);
    }
  }
} catch { /* private browsing / quota exceeded — safe to ignore */ }

createRoot(document.getElementById("root")!).render(<App />);
