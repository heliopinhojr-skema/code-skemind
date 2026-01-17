import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Corrige ambientes onde query string vem embutida no pathname (ex.: "/?debug=1")
// Isso ocorre ANTES do React montar, portanto BrowserRouter vê a URL correta.
(function fixMalformedPathname() {
  if (typeof window === "undefined") return;

  const { pathname, search, hash } = window.location;

  // Detecta se há query dentro do pathname (ex.: "/?debug=1")
  if (pathname.includes("?")) {
    const qIndex = pathname.indexOf("?");
    const cleanPath = pathname.slice(0, qIndex) || "/";
    const embeddedQuery = pathname.slice(qIndex + 1);

    // Mescla query existente com a embutida
    const existingParams = new URLSearchParams(search);
    const embeddedParams = new URLSearchParams(embeddedQuery);
    embeddedParams.forEach((v, k) => existingParams.set(k, v));

    const newSearch = existingParams.toString() ? `?${existingParams.toString()}` : "";
    const correctedUrl = `${cleanPath}${newSearch}${hash}`;

    // Usa replaceState para corrigir sem reload (mais suave)
    window.history.replaceState({}, "", correctedUrl);
  }
})();

createRoot(document.getElementById("root")!).render(<App />);
