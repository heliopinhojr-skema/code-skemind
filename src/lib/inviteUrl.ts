/**
 * Returns the correct origin for invite links.
 * In preview/sandbox environments, forces the production URL
 * so invited users land on the real app, not the Lovable editor.
 */
const PRODUCTION_ORIGIN = 'https://skemind-code-guess.lovable.app';

export function getInviteOrigin(): string {
  const origin = window.location.origin;
  // Detect Lovable preview/sandbox environments
  if (
    origin.includes('lovableproject.com') ||
    origin.includes('localhost') ||
    origin.includes('id-preview--')
  ) {
    return PRODUCTION_ORIGIN;
  }
  return origin;
}

export function buildInviteUrl(code: string): string {
  return `${getInviteOrigin()}/auth?convite=${encodeURIComponent(code)}`;
}
