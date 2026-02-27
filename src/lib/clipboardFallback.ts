/**
 * Copy text to clipboard with fallback for all environments.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Method 1: Clipboard API (works on HTTPS + same-origin)
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // blocked in iframes / insecure contexts — fall through
  }

  // Method 2: Classic execCommand with textarea
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;padding:0;border:none;outline:none;box-shadow:none;opacity:0.01';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    if (ok) return true;
  } catch {
    // fall through
  }

  // Method 3: Open a prompt so the user can manually Ctrl+C
  try {
    window.prompt('Copie manualmente (Ctrl+C):', text);
  } catch {
    // ignore
  }
  return true;
}
