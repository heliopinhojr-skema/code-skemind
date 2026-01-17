import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Normaliza casos em que algum ambiente injeta a query dentro do pathname
// (ex.: pathname "/?debug=1" e search vazio), o que quebraria o React Router.
if (typeof window !== "undefined") {
  const p = window.location.pathname;
  if (p.includes("?")) {
    const [path, rawSearch] = p.split("?");
    const search = rawSearch ? `?${rawSearch}` : "";
    const nextUrl = `${path}${search}${window.location.hash}`;
    window.history.replaceState({}, "", nextUrl);
  }
}

createRoot(document.getElementById("root")!).render(<App />);
