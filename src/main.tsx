import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Corrige pathname malformado (ex.: "/?debug=1" vindo de sandboxes).
// Isso ocorre ANTES do React montar, portanto o Router vê a URL correta.
(function fixMalformedPathname() {
  if (typeof window === "undefined") return;

  const { pathname, search, hash } = window.location;

  // Detecta se há query dentro do pathname (ex.: "/?debug=1")
  if (pathname.includes("?")) {
    const [cleanPath, embeddedQuery] = pathname.split("?");
    // Junta query já existente com a embedded
    const existingParams = new URLSearchParams(search);
    const embeddedParams = new URLSearchParams(embeddedQuery);
    embeddedParams.forEach((v, k) => existingParams.set(k, v));

    const newSearch = existingParams.toString() ? `?${existingParams.toString()}` : "";
    const newUrl = `${cleanPath || "/"}${newSearch}${hash}`;

    // Se realmente mudou a URL, precisamos reload para o Router ver correto
    if (window.location.href !== window.location.origin + newUrl) {
      window.location.replace(newUrl);
      // Não renderiza enquanto o reload não ocorrer
      throw new Error("Reloading to fix URL");
    }
  }
})();

createRoot(document.getElementById("root")!).render(<App />);
