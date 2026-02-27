/**
 * Copy text to clipboard with fallback for all environments.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Method 1: Clipboard API (works on HTTPS + same-origin)
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // blocked in iframes / insecure contexts
  }

  // Method 2: Classic execCommand
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    if (ok) return true;
  } catch {
    document.body.removeChild(ta);
  }

  // Method 3: prompt — user can Ctrl+C from there
  window.prompt('Copie manualmente (Ctrl+C):', text);
  return true;
}
