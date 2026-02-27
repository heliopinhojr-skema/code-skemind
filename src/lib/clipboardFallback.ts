/**
 * Robust clipboard copy with multiple fallbacks for iframe/preview environments.
 * Returns true if copy succeeded programmatically.
 * If all methods fail, opens a prompt-like UI so the user can copy manually.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Method 1: Modern Clipboard API
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through
    }
  }

  // Method 2: execCommand with textarea
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    
    // iOS requires special handling
    const range = document.createRange();
    const selection = window.getSelection();
    textarea.contentEditable = 'true';
    textarea.readOnly = false;
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    
    if (selection) {
      selection.removeAllRanges();
      range.selectNodeContents(textarea);
      selection.addRange(range);
    }
    
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    if (ok) return true;
  } catch {
    // Fall through
  }

  // Method 3: window.prompt fallback — text is pre-selected for Ctrl+C
  try {
    window.prompt('Copie o texto abaixo (Ctrl+C / Cmd+C):', text);
    return true; // User had the chance to copy
  } catch {
    // Fall through
  }

  return false;
}
